import { room, join, answerOf, far } from './helpers';

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

function duelRoom() {
  const r = room();
  const ana = join(r, 'Ana'), bia = join(r, 'Bia'), caio = join(r, 'Caio');
  r.updateSettings(ana, { mode: 'duel' });
  return { r, ana, bia, caio };
}

test('quem entra no lobby vai para o time menor', () => {
  const { r, ana, bia, caio } = duelRoom();
  const team = (id: string) => r.view().players.find((p) => p.id === id)!.team;
  expect([team(ana), team(bia), team(caio)]).toEqual(['A', 'B', 'A']);
});

test('duelo: melhor palpite do time, dano com multiplicador', () => {
  const { r, ana, bia, caio } = duelRoom();
  r.start(ana);
  expect(r.view().duelHp).toEqual({ A: 6000, B: 6000 });
  const ans = answerOf(r);
  r.guess(ana, far); r.guess(caio, ans); r.guess(bia, far);
  const d = r.view().result!.duel!;
  expect(d.teamScores.A).toBe(5000);
  expect(d.damagedTeam).toBe('B');
  expect(d.multiplier).toBe(1);
  expect(r.view().duelHp!.B).toBe(6000 - d.damage);
});

test('primeiro palpite encurta o tempo para 15 s', () => {
  const { r, ana } = duelRoom();
  r.updateSettings(ana, { roundTimeSec: 120 }); r.start(ana);
  vi.advanceTimersByTime(10_000);
  r.guess(ana, far);
  expect(r.view().round!.deadline).toBe(Date.now() + 15_000);
  vi.advanceTimersByTime(15_000);
  expect(r.view().phase).toBe('result');
});

test('primeiro palpite não estica o tempo quando falta menos que 15 s', () => {
  const { r, ana } = duelRoom();
  r.updateSettings(ana, { roundTimeSec: 20 }); r.start(ana);
  const deadline = r.view().round!.deadline;
  vi.advanceTimersByTime(10_000);
  r.guess(ana, far);
  expect(r.view().round!.deadline).toBe(deadline);
});

test('duelo mostra o resultado e termina quando a vida zera', () => {
  const { r, ana, bia, caio } = duelRoom();
  r.updateSettings(ana, { duelStartHp: 1000 }); r.start(ana);
  r.guess(ana, answerOf(r)); r.guess(caio, far); r.guess(bia, far);
  expect(r.view().phase).toBe('result');
  expect(r.view().duelHp!.B).toBe(0);
  r.next(ana);
  expect(r.view().phase).toBe('finished');
  expect(r.view().winner).toEqual({ team: 'A' });
});

test('duelo continua além de settings.rounds enquanto ninguém zera', () => {
  const { r, ana, bia, caio } = duelRoom();
  r.updateSettings(ana, { rounds: 1 }); r.start(ana);
  r.guess(ana, far); r.guess(caio, far); r.guess(bia, far);
  r.next(ana);
  expect(r.view().phase).toBe('round');
  expect(r.view().round!.number).toBe(2);
});

test('duelo não inicia com um time vazio', () => {
  const r = room(); const ana = join(r, 'Ana'), bia = join(r, 'Bia');
  r.updateSettings(ana, { mode: 'duel' });
  r.setTeam(bia, bia, 'A');
  r.start(ana);
  expect(r.view().phase).toBe('lobby');
});

test('setTeam: o próprio jogador ou o host, só no lobby', () => {
  const { r, ana, bia, caio } = duelRoom();
  const team = (id: string) => r.view().players.find((p) => p.id === id)!.team;
  r.setTeam(bia, caio, 'B'); expect(team(caio)).toBe('A');
  r.setTeam(caio, caio, 'B'); expect(team(caio)).toBe('B');
  r.setTeam(ana, caio, 'A'); expect(team(caio)).toBe('A');
  r.setTeam(ana, caio, 'X' as any); expect(team(caio)).toBe('A');
  r.start(ana); r.setTeam(ana, caio, 'B'); expect(team(caio)).toBe('A');
});
