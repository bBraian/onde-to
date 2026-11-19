import { DEFAULT_AVATAR, mulberry32, type GameMap } from '@onde-to/shared';
import { localReducer, visiblePins, type LocalSettings, type LocalState } from '../src/game/local';

const map: GameMap = {
  id: 't', nome: 'T', tamanhoKm: 4000,
  pontos: [
    { imageId: 'a', lat: -23.55, lng: -46.63, regiao: 'SP' },
    { imageId: 'b', lat: -22.9, lng: -43.17, regiao: 'RJ' },
    { imageId: 'c', lat: -30.03, lng: -51.22, regiao: 'RS' },
    { imageId: 'd', lat: -15.79, lng: -47.88, regiao: 'DF' },
  ],
};
const P = (id: string) => ({ id, nick: id.toUpperCase(), avatar: DEFAULT_AVATAR });
const settings = (over: Partial<LocalSettings> = {}): LocalSettings => ({
  mapId: 't', rounds: 2, timeSec: 60, movement: 'move', guessMode: 'turns', scoring: 'distance', ...over,
});
const start = (players: string[], over: Partial<LocalSettings> = {}) =>
  localReducer({ phase: 'setup' }, { type: 'start', settings: settings(over), players: players.map(P), map, rng: mulberry32(1), now: 0 });
const point = (s: LocalState) => ('point' in s ? s.point : null)!;
const far = { lat: 60, lng: 100 };

test('turns: start vai para a vez do primeiro; ready → guessing com prazo por vez', () => {
  let s = start(['ana', 'bia']);
  expect(s).toMatchObject({ phase: 'gate', turnIndex: 0, deadline: null });
  s = localReducer(s, { type: 'ready', now: 1000 });
  expect(s).toMatchObject({ phase: 'guessing', activeId: 'ana', deadline: 61_000 });
});

test('turns: depois do palpite vem a vez do próximo e nenhum pino fica visível', () => {
  let s = localReducer(start(['ana', 'bia']), { type: 'ready', now: 0 });
  s = localReducer(s, { type: 'guess', guess: point(s), now: 1 });
  expect(s).toMatchObject({ phase: 'gate', turnIndex: 1 });
  expect(visiblePins(s)).toEqual([]);
  s = localReducer(s, { type: 'ready', now: 2 });
  expect(s).toMatchObject({ phase: 'guessing', activeId: 'bia' });
  expect(visiblePins(s)).toEqual([]);
});

test('turns: último palpite → resultado com os palpites de todos', () => {
  let s = localReducer(start(['ana', 'bia']), { type: 'ready', now: 0 });
  const ans = point(s);
  s = localReducer(s, { type: 'guess', guess: ans, now: 1 });
  s = localReducer(localReducer(s, { type: 'ready', now: 2 }), { type: 'guess', guess: far, now: 3 });
  if (s.phase !== 'result') throw new Error(s.phase);
  expect(s.last.guesses.map((g) => [g.playerId, g.score])).toEqual([['ana', 5000], ['bia', 0]]);
  expect(s.totals).toEqual({ ana: 5000, bia: 0 });
});

test('turns: tempo esgotado conta como sem palpite e a vez passa', () => {
  let s = localReducer(start(['ana', 'bia']), { type: 'ready', now: 0 });
  s = localReducer(s, { type: 'guess', guess: null, now: 60_000 });
  expect(s).toMatchObject({ phase: 'gate', turnIndex: 1 });
  s = localReducer(localReducer(s, { type: 'ready', now: 1 }), { type: 'guess', guess: far, now: 2 });
  if (s.phase !== 'result') throw new Error();
  expect(s.last.guesses[0]).toMatchObject({ playerId: 'ana', guess: null, distanceKm: null, score: 0 });
});

test('turns: a ordem gira a cada rodada', () => {
  let s = localReducer(start(['ana', 'bia', 'caio']), { type: 'ready', now: 0 });
  for (let i = 0; i < 3; i++) {
    s = localReducer(s, { type: 'guess', guess: far, now: 1 });
    if (s.phase === 'gate') s = localReducer(s, { type: 'ready', now: 1 });
  }
  s = localReducer(s, { type: 'next', now: 2 });
  s = localReducer(s, { type: 'ready', now: 3 });
  expect(s).toMatchObject({ phase: 'guessing', round: 2, activeId: 'bia' });
});

test('same-map: place põe no ativo, select troca e todos os pinos ficam visíveis', () => {
  let s = start(['ana', 'bia'], { guessMode: 'same-map' });
  expect(s).toMatchObject({ phase: 'guessing', activeId: 'ana', deadline: 60_000 });
  s = localReducer(s, { type: 'place', guess: { lat: 1, lng: 1 } });
  s = localReducer(s, { type: 'select', playerId: 'bia' });
  s = localReducer(s, { type: 'place', guess: { lat: 2, lng: 2 } });
  s = localReducer(s, { type: 'place', guess: { lat: 3, lng: 3 } });
  expect(visiblePins(s)).toEqual([{ playerId: 'ana', guess: { lat: 1, lng: 1 } }, { playerId: 'bia', guess: { lat: 3, lng: 3 } }]);
});

test('same-map: revelar só com todos marcados', () => {
  let s = start(['ana', 'bia'], { guessMode: 'same-map' });
  s = localReducer(s, { type: 'place', guess: far });
  expect(localReducer(s, { type: 'reveal' })).toBe(s);
  s = localReducer(localReducer(s, { type: 'select', playerId: 'bia' }), { type: 'place', guess: far });
  expect(localReducer(s, { type: 'reveal' }).phase).toBe('result');
});

test('same-map: fim do tempo revela com quem faltou sem palpite', () => {
  let s = start(['ana', 'bia'], { guessMode: 'same-map' });
  s = localReducer(s, { type: 'place', guess: point(s) });
  s = localReducer(s, { type: 'timeout' });
  if (s.phase !== 'result') throw new Error();
  expect(s.last.guesses.find((g) => g.playerId === 'bia')).toMatchObject({ guess: null, score: 0 });
});

test('pontuação por rodada: o mais próximo faz 1; empate dá 1 aos dois', () => {
  let s = start(['ana', 'bia'], { guessMode: 'same-map', scoring: 'rounds' });
  const ans = point(s);
  s = localReducer(s, { type: 'place', guess: ans });
  s = localReducer(localReducer(s, { type: 'select', playerId: 'bia' }), { type: 'place', guess: far });
  s = localReducer(s, { type: 'reveal' });
  if (s.phase !== 'result') throw new Error();
  expect(s.last.guesses.map((g) => g.points)).toEqual([1, 0]);
  expect(s.totals).toEqual({ ana: 1, bia: 0 });
  s = localReducer(s, { type: 'next', now: 1 });
  const ans2 = point(s);
  expect(s).toMatchObject({ activeId: 'bia' }); // a ordem girou: a rodada 2 começa pela Bia
  s = localReducer(localReducer(s, { type: 'select', playerId: 'ana' }), { type: 'place', guess: ans2 });
  s = localReducer(localReducer(s, { type: 'select', playerId: 'bia' }), { type: 'place', guess: ans2 });
  s = localReducer(s, { type: 'reveal' });
  if (s.phase !== 'result') throw new Error();
  expect(s.totals).toEqual({ ana: 2, bia: 1 });
});

test('final: vencedores com empate depois da última rodada', () => {
  let s = start(['ana', 'bia'], { guessMode: 'same-map', rounds: 1 });
  s = localReducer(s, { type: 'timeout' });
  s = localReducer(s, { type: 'next', now: 1 });
  expect(s).toMatchObject({ phase: 'final', winners: ['ana', 'bia'], totals: { ana: 0, bia: 0 } });
});

test('1 jogador: vai direto para o palpite, soma pontos e termina no final', () => {
  let s = start(['ana']);
  expect(s).toMatchObject({ phase: 'guessing', activeId: 'ana', deadline: 60_000 });
  s = localReducer(s, { type: 'guess', guess: point(s), now: 1 });
  expect(s.phase).toBe('result');
  s = localReducer(s, { type: 'next', now: 2 });
  expect(s).toMatchObject({ phase: 'guessing', round: 2 });
  s = localReducer(localReducer(s, { type: 'guess', guess: null, now: 3 }), { type: 'next', now: 4 });
  expect(s).toMatchObject({ phase: 'final', totals: { ana: 5000 }, winners: ['ana'] });
});

test('skip troca o ponto, zera os palpites e mantém a rodada', () => {
  let s = localReducer(start(['ana', 'bia']), { type: 'ready', now: 0 });
  const before = point(s).imageId;
  s = localReducer(s, { type: 'guess', guess: far, now: 1 });
  s = localReducer(localReducer(s, { type: 'ready', now: 2 }), { type: 'skip', now: 3 });
  expect(s).toMatchObject({ phase: 'gate', turnIndex: 0, round: 1 });
  expect(point(s).imageId).not.toBe(before);
  expect('pending' in s && s.pending).toEqual({});
});

test('mapa com menos pontos que rodadas termina quando acabam os pontos', () => {
  let s = start(['ana'], { rounds: 10, timeSec: null });
  for (let i = 0; i < 4; i++) s = localReducer(localReducer(s, { type: 'guess', guess: null, now: i }), { type: 'next', now: i });
  expect(s.phase).toBe('final');
});

test('ação fora de fase devolve o mesmo objeto', () => {
  const s = start(['ana', 'bia']);
  expect(localReducer(s, { type: 'next', now: 1 })).toBe(s);
  expect(localReducer(s, { type: 'reveal' })).toBe(s);
});
