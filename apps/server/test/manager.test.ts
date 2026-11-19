import { mulberry32, type JoinAck } from '@onde-to/shared';
import { RoomManager } from '../src/RoomManager';
import { generateCode, normalizeCode, sanitizeNick, CODE_ALPHABET } from '../src/codes';
import { testMap } from './helpers';

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

const manager = () => new RoomManager({ loadMap: () => testMap, allowedMapIds: ['teste'], rng: mulberry32(7), onChange: () => {}, provider: 'mapillary' });
function ok(r: JoinAck) {
  if (!r.ok) throw new Error(r.error);
  return r;
}

test('generateCode usa 4 caracteres do alfabeto sem ambíguos e evita repetidos', () => {
  const rng = mulberry32(1);
  const taken = new Set<string>();
  for (let i = 0; i < 200; i++) {
    const c = generateCode(rng, taken);
    expect(c).toMatch(new RegExp(`^[${CODE_ALPHABET}]{4}$`));
    expect(taken.has(c)).toBe(false);
    taken.add(c);
  }
  expect(CODE_ALPHABET).not.toMatch(/[01OI]/);
});

test('normalizeCode e sanitizeNick', () => {
  expect(normalizeCode(' k7-qx ')).toBe('K7QX');
  expect(sanitizeNick('   ', [])).toBeNull();
  expect(sanitizeNick(42 as any, [])).toBeNull();
  expect(sanitizeNick('  Ana   Paula ', [])).toBe('Ana Paula');
  expect(sanitizeNick('x'.repeat(40), [])).toHaveLength(20);
  expect(sanitizeNick('Ana', ['Ana'])).toBe('Ana (2)');
  expect(sanitizeNick('ana', ['Ana', 'ana (2)'])).toBe('ana (3)');
  expect(sanitizeNick('x'.repeat(20), ['x'.repeat(20)])).toHaveLength(20);
});

test('criar e entrar com código em minúsculas', () => {
  const m = manager();
  const { code } = ok(m.create('s1', 'Ana'));
  const j = ok(m.join(code.toLowerCase(), 's2', 'Ana'));
  expect(j.code).toBe(code);
  expect(m.get(code)!.view().players.map((p) => p.nick)).toEqual(['Ana', 'Ana (2)']);
});

test('apelido inválido e sala inexistente', () => {
  const m = manager();
  expect(m.create('s1', '  ')).toEqual({ ok: false, error: 'invalid_nick' });
  expect(m.join('ZZZZ', 's1', 'Ana')).toEqual({ ok: false, error: 'not_found' });
});

test('reconexão pela session mantém id, apelido, pontos e time', () => {
  const m = manager();
  const { code, playerId } = ok(m.create('s1', 'Ana'));
  m.get(code)!.setConnected(playerId, false);
  const again = ok(m.join(code, 's1', 'Ana'));
  expect(again.playerId).toBe(playerId);
  expect(m.get(code)!.view().players).toHaveLength(1);
  expect(m.get(code)!.view().players[0]).toMatchObject({ nick: 'Ana', connected: true });
});

test('entrada no meio da partida vira espectador; 9º jogador recebe full', () => {
  const m = manager();
  const { code, playerId: ana } = ok(m.create('s1', 'Ana'));
  const r = m.get(code)!;
  r.updateSettings(ana, { mapId: 'teste' });
  r.start(ana);
  const late = ok(m.join(code, 's2', 'Bia')).playerId;
  expect(r.view().players.find((p) => p.id === late)!.spectator).toBe(true);
  for (let i = 3; i <= 8; i++) ok(m.join(code, `s${i}`, `P${i}`));
  expect(m.join(code, 's9', 'Nove')).toEqual({ ok: false, error: 'full' });
});

test('espectador vira jogador ao voltar para o lobby', () => {
  const m = manager();
  const { code, playerId: ana } = ok(m.create('s1', 'Ana'));
  const r = m.get(code)!;
  r.start(ana);
  const bia = ok(m.join(code, 's2', 'Bia')).playerId;
  r.backToLobby(ana);
  expect(r.view().players.find((p) => p.id === bia)).toMatchObject({ spectator: false, team: 'B' });
});

test('host passa adiante após 30 s desconectado', () => {
  const m = manager();
  const { code, playerId: ana } = ok(m.create('s1', 'Ana'));
  const bia = ok(m.join(code, 's2', 'Bia')).playerId;
  const r = m.get(code)!;
  r.setConnected(ana, false);
  vi.advanceTimersByTime(29_000);
  expect(r.view().players.find((p) => p.id === ana)!.isHost).toBe(true);
  vi.advanceTimersByTime(1_000);
  expect(r.view().players.find((p) => p.id === bia)!.isHost).toBe(true);
});

test('host que volta antes de 30 s continua host', () => {
  const m = manager();
  const { code, playerId: ana } = ok(m.create('s1', 'Ana'));
  ok(m.join(code, 's2', 'Bia'));
  const r = m.get(code)!;
  r.start(ana);
  r.setConnected(ana, false);
  vi.advanceTimersByTime(10_000);
  ok(m.join(code, 's1', 'Ana'));
  vi.advanceTimersByTime(30_000);
  expect(r.view().players.find((p) => p.id === ana)!.isHost).toBe(true);
});

test('host que sai passa o papel para o conectado mais antigo', () => {
  const m = manager();
  const { code, playerId: ana } = ok(m.create('s1', 'Ana'));
  const bia = ok(m.join(code, 's2', 'Bia')).playerId;
  const caio = ok(m.join(code, 's3', 'Caio')).playerId;
  const r = m.get(code)!;
  r.setConnected(bia, false);
  r.removePlayer(ana);
  expect(r.view().players.find((p) => p.id === caio)!.isHost).toBe(true);
});

test('no lobby, desconectado há 60 s é removido', () => {
  const m = manager();
  const { code } = ok(m.create('s1', 'Ana'));
  const bia = ok(m.join(code, 's2', 'Bia')).playerId;
  const r = m.get(code)!;
  r.setConnected(bia, false);
  vi.advanceTimersByTime(60_000);
  expect(r.view().players.map((p) => p.nick)).toEqual(['Ana']);
});

test('sweep remove sala sem ninguém conectado há 10 min', () => {
  const m = manager();
  const { code, playerId } = ok(m.create('s1', 'Ana'));
  m.get(code)!.setConnected(playerId, false);
  m.sweep(Date.now() + 9 * 60_000);
  expect(m.get(code)).toBeDefined();
  m.sweep(Date.now() + 10 * 60_000);
  expect(m.get(code)).toBeUndefined();
});
