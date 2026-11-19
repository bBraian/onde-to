import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, JoinAck, RoomView, ServerToClientEvents } from '@onde-to/shared';
import { config } from './config';
import { getSession } from './session';
import { getAvatar } from '../avatar/storage';

export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
export type RoomStatus = 'connecting' | 'waking' | 'joined' | 'not_found' | 'full' | 'invalid_nick';

/** Envia um evento tipado do cliente para o servidor (sem efeito se o socket não existir). */
export type Send = <E extends keyof ClientToServerEvents>(event: E, ...args: Parameters<ClientToServerEvents[E]>) => void;

export const clockOffset = (serverNow: number, localNow: number) => serverNow - localNow;

export const NEW_ROOM = 'nova';
const WAKING_AFTER_MS = 3000;

/**
 * Conecta na sala `code` (ou cria uma, se code === 'nova') e acompanha o RoomView do servidor.
 * Em toda reconexão do socket entra de novo com a mesma session, recuperando o lugar.
 */
export function useRoom(code: string, nick: string | null, onCreated: (code: string) => void) {
  const [view, setView] = useState<RoomView | null>(null);
  const [me, setMe] = useState<string | null>(null);
  const [offsetMs, setOffsetMs] = useState(0);
  const [status, setStatus] = useState<RoomStatus>('connecting');
  const socketRef = useRef<GameSocket | null>(null);
  const joinedCode = useRef<string | null>(code === NEW_ROOM ? null : code);
  const onCreatedRef = useRef(onCreated);
  onCreatedRef.current = onCreated;

  useEffect(() => {
    if (!nick) return;
    const socket: GameSocket = io(config.serverUrl, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;
    setStatus('connecting');
    const waking = window.setTimeout(() => {
      if (!socket.connected) setStatus('waking');
    }, WAKING_AFTER_MS);

    const handleAck = (ack: JoinAck) => {
      if (!ack.ok) {
        setStatus(ack.error);
        return;
      }
      setMe(ack.playerId);
      setStatus('joined');
      if (!joinedCode.current) {
        joinedCode.current = ack.code;
        onCreatedRef.current(ack.code);
      }
    };

    socket.on('connect', () => {
      window.clearTimeout(waking);
      const session = getSession();
      const avatar = getAvatar();
      if (joinedCode.current) socket.emit('room:join', { code: joinedCode.current, nick, session, avatar }, handleAck);
      else socket.emit('room:create', { nick, session, avatar }, handleAck);
    });
    socket.on('room:state', (v) => {
      setView(v);
      setOffsetMs(clockOffset(v.serverNow, Date.now()));
    });

    return () => {
      window.clearTimeout(waking);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [nick]);

  const send: Send = useCallback((event, ...args) => {
    const socket = socketRef.current;
    if (socket) (socket.emit as (e: string, ...a: unknown[]) => void).call(socket, event, ...args);
  }, []);

  return { view, me, offsetMs, status, send };
}
