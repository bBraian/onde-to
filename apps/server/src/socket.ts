import { createServer as createHttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { Server, type Socket } from 'socket.io';
import type { ClientToServerEvents, JoinAck, ServerToClientEvents, StreetProvider } from '@onde-to/shared';
import { availableMapIds, loadMapServer } from './maps';
import { RoomManager } from './RoomManager';
import type { Room } from './Room';

interface SocketData {
  code?: string;
  playerId?: string;
}

type IO = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
type ClientSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

const SWEEP_EVERY_MS = 60_000;

/** Liga os eventos de cada socket ao Room da sua sala. */
export function attachSocket(io: IO, manager: RoomManager): void {
  // Socket ativo de cada jogador: só ele pode marcar o jogador como desconectado.
  const activeSocket = new Map<string, string>();
  const key = (code: string, playerId: string) => `${code}:${playerId}`;

  io.on('connection', (socket: ClientSocket) => {
    const ctx = (): { room: Room; playerId: string } | null => {
      const { code, playerId } = socket.data;
      const room = code ? manager.get(code) : undefined;
      return room && playerId ? { room, playerId } : null;
    };

    const enter = (ack: JoinAck) => {
      if (!ack.ok) return;
      const prev = socket.data.code;
      if (prev && prev !== ack.code) socket.leave(prev);
      socket.data = { code: ack.code, playerId: ack.playerId };
      activeSocket.set(key(ack.code, ack.playerId), socket.id);
      socket.join(ack.code);
      const room = manager.get(ack.code);
      if (room) socket.emit('room:state', room.view());
    };

    const safe =
      <A extends unknown[]>(fn: (...args: A) => void) =>
      (...args: A) => {
        try {
          fn(...args);
        } catch (err) {
          console.error('[socket]', err);
        }
      };

    socket.on('room:create', safe((p, ack) => {
      const res = manager.create(String(p?.session ?? ''), String(p?.nick ?? ''), p?.avatar);
      enter(res);
      if (typeof ack === 'function') ack(res);
    }));

    socket.on('room:join', safe((p, ack) => {
      const res = manager.join(String(p?.code ?? ''), String(p?.session ?? ''), String(p?.nick ?? ''), p?.avatar);
      enter(res);
      if (typeof ack === 'function') ack(res);
    }));

    socket.on('room:leave', safe(() => {
      const c = ctx();
      if (!c) return;
      activeSocket.delete(key(c.room.code, c.playerId));
      socket.leave(c.room.code);
      socket.data = {};
      c.room.removePlayer(c.playerId);
    }));

    socket.on('room:avatar', safe((p) => { const c = ctx(); c?.room.setAvatar(c.playerId, p); }));
    socket.on('room:settings', safe((p) => { const c = ctx(); c?.room.updateSettings(c.playerId, p ?? {}); }));
    socket.on('room:team', safe((p) => { const c = ctx(); if (c && p) c.room.setTeam(c.playerId, String(p.playerId), p.team); }));
    socket.on('room:start', safe(() => { const c = ctx(); c?.room.start(c.playerId); }));
    socket.on('room:lobby', safe(() => { const c = ctx(); c?.room.backToLobby(c.playerId); }));
    socket.on('round:guess', safe((p) => { const c = ctx(); if (c && p) c.room.guess(c.playerId, p); }));
    socket.on('round:end', safe(() => { const c = ctx(); c?.room.endRound(c.playerId); }));
    socket.on('round:reroll', safe(() => { const c = ctx(); c?.room.reroll(c.playerId); }));
    socket.on('round:next', safe(() => { const c = ctx(); c?.room.next(c.playerId); }));

    socket.on('disconnect', safe(() => {
      const c = ctx();
      if (!c) return;
      const k = key(c.room.code, c.playerId);
      if (activeSocket.get(k) !== socket.id) return;
      activeSocket.delete(k);
      c.room.setConnected(c.playerId, false);
    }));
  });
}

export async function createServer(opts: {
  port: number;
  corsOrigin: string;
  enableTestMap: boolean;
  provider?: StreetProvider;
}): Promise<{ close(): Promise<void>; port: number }> {
  const http = createHttpServer((req, res) => {
    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'content-type': 'text/plain' }).end('ok');
      return;
    }
    res.writeHead(404).end();
  });

  const io: IO = new Server(http, { cors: { origin: opts.corsOrigin } });
  const provider = opts.provider ?? 'mapillary';
  const manager = new RoomManager({
    loadMap: (id) => loadMapServer(id, provider),
    allowedMapIds: availableMapIds(opts.enableTestMap, provider),
    provider,
    rng: Math.random,
    onChange: (room) => io.to(room.code).emit('room:state', room.view()),
  });
  attachSocket(io, manager);

  const sweep = setInterval(() => manager.sweep(Date.now()), SWEEP_EVERY_MS);
  sweep.unref();

  await new Promise<void>((resolve) => http.listen(opts.port, resolve));
  const port = (http.address() as AddressInfo).port;

  return {
    port,
    close: () =>
      new Promise<void>((resolve) => {
        clearInterval(sweep);
        io.close(() => resolve());
      }),
  };
}
