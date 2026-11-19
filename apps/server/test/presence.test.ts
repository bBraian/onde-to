import { room, join, answerOf } from './helpers';

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

test('quem saiu no meio da partida some do lobby 60 s depois de "Jogar de novo"', () => {
  const r = room(); const ana = join(r, 'Ana'), bia = join(r, 'Bia');
  r.updateSettings(ana, { rounds: 1 }); r.start(ana);
  r.setConnected(bia, false);
  r.guess(ana, answerOf(r)); r.next(ana);
  r.backToLobby(ana);
  expect(r.view().players.map((p) => p.nick)).toEqual(['Ana', 'Bia']);
  vi.advanceTimersByTime(60_000);
  expect(r.view().players.map((p) => p.nick)).toEqual(['Ana']);
});

test('duelo não começa com um time formado só por desconectados', () => {
  const r = room(); const ana = join(r, 'Ana'), bia = join(r, 'Bia');
  r.updateSettings(ana, { mode: 'duel' });
  r.setConnected(bia, false);
  r.start(ana);
  expect(r.view().phase).toBe('lobby');
});

test('se todos caíram, o primeiro a voltar depois da carência vira host', () => {
  const r = room(); const ana = join(r, 'Ana'), bia = join(r, 'Bia');
  r.updateSettings(ana, { roundTimeSec: null, autoAdvanceSec: null }); r.start(ana);
  r.setConnected(ana, false); r.setConnected(bia, false);
  vi.advanceTimersByTime(30_000);
  r.addPlayer('s-Bia', 'Bia');
  expect(r.view().players.find((p) => p.id === bia)!.isHost).toBe(true);
  r.guess(bia, { lat: 0, lng: 0 });
  r.next(bia);
  expect(r.view().phase).toBe('round');
});

test('host que sai deixando só desconectados: o primeiro a voltar assume', () => {
  const r = room(); const ana = join(r, 'Ana'), bia = join(r, 'Bia');
  r.start(ana);
  r.setConnected(bia, false);
  r.removePlayer(ana);
  r.addPlayer('s-Bia', 'Bia');
  expect(r.view().players.find((p) => p.id === bia)!.isHost).toBe(true);
});

test('quem volta antes da carência não rouba o host', () => {
  const r = room(); const ana = join(r, 'Ana'), bia = join(r, 'Bia');
  r.start(ana);
  r.setConnected(ana, false); r.setConnected(bia, false);
  vi.advanceTimersByTime(10_000);
  r.addPlayer('s-Bia', 'Bia');
  expect(r.view().players.find((p) => p.id === ana)!.isHost).toBe(true);
  vi.advanceTimersByTime(20_000);
  expect(r.view().players.find((p) => p.id === bia)!.isHost).toBe(true);
});
