import { room, join, answerOf } from './helpers';

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

test('rodada não envia a resposta antes do resultado', () => {
  const r = room(); const a = join(r, 'Ana'); r.start(a);
  const v = r.view();
  expect(v.phase).toBe('round');
  expect(v.round!.imageId).toMatch(/^fake-/);
  expect(JSON.stringify(v)).not.toMatch(/"lat"/);
});

test('rodada termina quando todos os conectados chutam', () => {
  const r = room(); const a = join(r, 'Ana'), b = join(r, 'Bia'), c = join(r, 'Caio'); r.start(a);
  r.setConnected(c, false);
  r.guess(a, { lat: 0, lng: 0 }); expect(r.view().phase).toBe('round');
  r.guess(b, { lat: 0, lng: 0 }); expect(r.view().phase).toBe('result');
  expect(r.view().result!.guesses.find((g) => g.playerId === c)!.score).toBe(0);
});

test('desconectar o último que faltava encerra a rodada', () => {
  const r = room(); const a = join(r, 'Ana'), b = join(r, 'Bia'); r.start(a);
  r.guess(a, { lat: 0, lng: 0 });
  r.setConnected(b, false);
  expect(r.view().phase).toBe('result');
});

test('deadline encerra a rodada', () => {
  const r = room(); const a = join(r, 'Ana'); r.updateSettings(a, { roundTimeSec: 30 }); r.start(a);
  expect(r.view().round!.deadline).toBe(Date.now() + 30_000);
  vi.advanceTimersByTime(30_000);
  expect(r.view().phase).toBe('result');
});

test('palpite perfeito vale 5000 e soma no total', () => {
  const r = room(); const a = join(r, 'Ana'); r.start(a);
  r.guess(a, answerOf(r));
  expect(r.view().result!.guesses[0].score).toBe(5000);
  expect(r.view().result!.answer.imageId).toMatch(/^fake-/);
  expect(r.view().players[0].total).toBe(5000);
});

test('auto-avanço e fim do clássico', () => {
  const r = room(); const a = join(r, 'Ana'); r.updateSettings(a, { rounds: 2, autoAdvanceSec: 10 }); r.start(a);
  r.guess(a, { lat: 0, lng: 0 });
  expect(r.view().nextAt).toBe(Date.now() + 10_000);
  vi.advanceTimersByTime(10_000);
  expect(r.view().round!.number).toBe(2);
  r.guess(a, { lat: 0, lng: 0 }); r.next(a);
  expect(r.view().phase).toBe('finished');
  expect(r.view().winner).toEqual({ playerIds: [a] });
  expect(r.view().history).toHaveLength(2);
});

test('sem avanço automático, nextAt é null', () => {
  const r = room(); const a = join(r, 'Ana'); r.updateSettings(a, { autoAdvanceSec: null }); r.start(a);
  r.guess(a, { lat: 0, lng: 0 });
  expect(r.view().nextAt).toBeNull();
});

test('não-host não inicia; palpite inválido é ignorado', () => {
  const r = room(); const a = join(r, 'Ana'), b = join(r, 'Bia');
  r.start(b); expect(r.view().phase).toBe('lobby');
  r.start(a);
  r.guess(b, { lat: 999, lng: 0 });
  r.guess(b, { lat: 'x' as any, lng: 0 });
  expect(r.view().players.find((p) => p.id === b)!.hasGuessed).toBe(false);
});

test('palpite repetido é ignorado', () => {
  const r = room(); const a = join(r, 'Ana'), b = join(r, 'Bia'); r.start(a);
  const ans = answerOf(r);
  r.guess(a, { lat: 0, lng: 0 }); r.guess(a, ans); r.guess(b, { lat: 0, lng: 0 });
  expect(r.view().result!.guesses.find((g) => g.playerId === a)!.guess).toEqual({ lat: 0, lng: 0 });
});

test('host encerra a rodada', () => {
  const r = room(); const a = join(r, 'Ana'), b = join(r, 'Bia'); r.updateSettings(a, { roundTimeSec: null }); r.start(a);
  r.endRound(b); expect(r.view().phase).toBe('round');
  r.endRound(a); expect(r.view().phase).toBe('result');
});

test('reroll troca a imagem, zera palpites e reinicia o tempo', () => {
  const r = room(); const a = join(r, 'Ana'), b = join(r, 'Bia'); r.updateSettings(a, { roundTimeSec: 60 }); r.start(a);
  const first = r.view().round!.imageId;
  r.guess(b, { lat: 0, lng: 0 });
  vi.advanceTimersByTime(20_000);
  r.reroll(a);
  expect(r.view().round!.imageId).not.toBe(first);
  expect(r.view().round!.number).toBe(1);
  expect(r.view().players.every((p) => !p.hasGuessed)).toBe(true);
  expect(r.view().round!.deadline).toBe(Date.now() + 60_000);
});

test('configurações só mudam no lobby e pelo host', () => {
  const r = room(); const a = join(r, 'Ana'), b = join(r, 'Bia');
  r.updateSettings(b, { rounds: 9 }); expect(r.view().settings.rounds).toBe(5);
  r.updateSettings(a, { rounds: 9 }); expect(r.view().settings.rounds).toBe(9);
  r.start(a); r.updateSettings(a, { rounds: 3 }); expect(r.view().settings.rounds).toBe(9);
});

test('backToLobby zera pontuação e mantém a sala', () => {
  const r = room(); const a = join(r, 'Ana'); r.updateSettings(a, { rounds: 1 }); r.start(a);
  r.guess(a, answerOf(r)); r.next(a);
  r.backToLobby(a);
  const v = r.view();
  expect(v.phase).toBe('lobby'); expect(v.players[0].total).toBe(0); expect(v.history).toEqual([]); expect(v.winner).toBeNull();
});

test('onChange é chamado a cada mudança', () => {
  const calls: string[] = [];
  const r = room((x) => calls.push(x.view().phase));
  const a = join(r, 'Ana'); r.start(a); r.guess(a, { lat: 0, lng: 0 });
  expect(calls).toEqual(['lobby', 'round', 'result']);
});
