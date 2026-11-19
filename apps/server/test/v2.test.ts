import { DEFAULT_AVATAR, mulberry32 } from '@onde-to/shared';
import { Room } from '../src/Room';
import { answerOf, far, join, room, testMap } from './helpers';

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

const coroa = { color: '#3A86FF', eyes: 'oculos', mouth: 'risada', acc: 'coroa' } as const;

test('avatar entra na view, lixo vira o padrão e reconexão mantém', () => {
  const r = room();
  const ana = (r.addPlayer('s-ana', 'Ana', coroa) as { playerId: string }).playerId;
  const bia = (r.addPlayer('s-bia', 'Bia', 'lixo') as { playerId: string }).playerId;
  const v = () => r.view().players;
  expect(v().find((p) => p.id === ana)!.avatar).toEqual(coroa);
  expect(v().find((p) => p.id === bia)!.avatar).toEqual(DEFAULT_AVATAR);
  r.setConnected(ana, false);
  r.addPlayer('s-ana', 'Ana');
  expect(v().find((p) => p.id === ana)!.avatar).toEqual(coroa);
});

test('setAvatar troca o avatar (sanitizado)', () => {
  const r = room(); const ana = join(r, 'Ana');
  r.setAvatar(ana, coroa);
  expect(r.view().players[0].avatar).toEqual(coroa);
  r.setAvatar(ana, { color: 'x' });
  expect(r.view().players[0].avatar.color).toBe(DEFAULT_AVATAR.color);
});

test('Clássico com pontuação por rodada soma 1 por rodada para o mais próximo', () => {
  const r = room(); const ana = join(r, 'Ana'), bia = join(r, 'Bia');
  r.updateSettings(ana, { rounds: 2, scoring: 'rounds' }); r.start(ana);
  for (let i = 0; i < 2; i++) {
    r.guess(ana, answerOf(r)); r.guess(bia, far);
    const g = r.view().result!.guesses.find((x) => x.playerId === ana)!;
    expect(g.score).toBe(5000);
    r.next(ana);
  }
  const totals = Object.fromEntries(r.view().players.map((p) => [p.nick, p.total]));
  expect(totals).toEqual({ Ana: 2, Bia: 0 });
  expect(r.view().winner).toEqual({ playerIds: [ana] });
});

test('view informa o provedor', () => {
  const r = new Room('ABCD', { loadMap: () => testMap, allowedMapIds: ['teste'], rng: mulberry32(1), onChange: () => {}, provider: 'google' });
  expect(r.view().provider).toBe('google');
});

test('setNick troca o apelido no lobby, evita repetido e é ignorado durante a partida', () => {
  const r = room(); const ana = join(r, 'Ana'); join(r, 'Bia');
  r.setNick(ana, '  Aninha  ');
  expect(r.view().players[0].nick).toBe('Aninha');
  r.setNick(ana, 'bia');
  expect(r.view().players[0].nick).toBe('bia (2)');
  r.setNick(ana, '   ');
  expect(r.view().players[0].nick).toBe('bia (2)');
  r.start(ana);
  r.setNick(ana, 'Outro');
  expect(r.view().players[0].nick).toBe('bia (2)');
});
