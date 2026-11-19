import { io as connectClient, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, RoomView, ServerToClientEvents } from '@onde-to/shared';
import { createServer } from '../src/socket';

type Client = Socket<ServerToClientEvents, ClientToServerEvents>;

let server: Awaited<ReturnType<typeof createServer>>;
const clients: Client[] = [];

beforeEach(async () => {
  server = await createServer({ port: 0, corsOrigin: '*', enableTestMap: true });
});
afterEach(async () => {
  clients.splice(0).forEach((c) => c.disconnect());
  await server.close();
});

function connect(): Promise<Client> {
  const c: Client = connectClient(`http://localhost:${server.port}`, { transports: ['websocket'], forceNew: true });
  clients.push(c);
  return new Promise((resolve) => c.on('connect', () => resolve(c)));
}

function nextState(c: Client, pred: (v: RoomView) => boolean): Promise<RoomView> {
  return new Promise((resolve) => {
    const h = (v: RoomView) => { if (pred(v)) { c.off('room:state', h); resolve(v); } };
    c.on('room:state', h);
  });
}

test('health responde ok', async () => {
  const res = await fetch(`http://localhost:${server.port}/health`);
  expect(res.status).toBe(200);
  expect(await res.text()).toBe('ok');
});

test('criar, entrar, iniciar e receber o mesmo estado', async () => {
  const a = await connect(), b = await connect();
  const created = await a.emitWithAck('room:create', { nick: 'Ana', session: 's1' });
  if (!created.ok) throw new Error(created.error);
  const joined = await b.emitWithAck('room:join', { code: created.code.toLowerCase(), nick: 'Bia', session: 's2' });
  expect(joined.ok).toBe(true);
  const roundA = nextState(a, (v) => v.phase === 'round');
  const roundB = nextState(b, (v) => v.phase === 'round');
  a.emit('room:settings', { mapId: 'teste' });
  a.emit('room:start');
  const [va, vb] = await Promise.all([roundA, roundB]);
  expect(vb.players).toHaveLength(2);
  expect(vb.serverNow).toBeTypeOf('number');
  expect(va.round!.imageId).toBe(vb.round!.imageId);
});

test('quem entra recebe o estado na hora', async () => {
  const a = await connect(), b = await connect();
  const created = await a.emitWithAck('room:create', { nick: 'Ana', session: 's1' });
  if (!created.ok) throw new Error(created.error);
  const first = nextState(b, () => true);
  await b.emitWithAck('room:join', { code: created.code, nick: 'Bia', session: 's2' });
  expect((await first).players.map((p) => p.nick)).toEqual(['Ana', 'Bia']);
});

test('desconectar marca connected=false para os outros', async () => {
  const a = await connect(), b = await connect();
  const created = await a.emitWithAck('room:create', { nick: 'Ana', session: 's1' });
  if (!created.ok) throw new Error(created.error);
  await b.emitWithAck('room:join', { code: created.code, nick: 'Bia', session: 's2' });
  const gone = nextState(a, (v) => v.players.some((p) => p.nick === 'Bia' && !p.connected));
  b.disconnect();
  await gone;
});

test('socket antigo que cai depois da reconexão não derruba o jogador', async () => {
  const a = await connect(), b1 = await connect(), b2 = await connect();
  const created = await a.emitWithAck('room:create', { nick: 'Ana', session: 's1' });
  if (!created.ok) throw new Error(created.error);
  await b1.emitWithAck('room:join', { code: created.code, nick: 'Bia', session: 's2' });
  await b2.emitWithAck('room:join', { code: created.code, nick: 'Bia', session: 's2' });
  b1.disconnect();
  await new Promise((r) => setTimeout(r, 100));
  const v = await new Promise<RoomView>((resolve) => { a.once('room:state', resolve); a.emit('room:settings', { rounds: 3 }); });
  expect(v.players.find((p) => p.nick === 'Bia')!.connected).toBe(true);
});

test('payload malformado não derruba o servidor', async () => {
  const a = await connect();
  const created = await a.emitWithAck('room:create', { nick: 'Ana', session: 's1' });
  if (!created.ok) throw new Error(created.error);
  (a as any).emit('room:settings', null);
  (a as any).emit('round:guess', null);
  a.emit('room:start');
  await nextState(a, (v) => v.phase === 'round');
});
