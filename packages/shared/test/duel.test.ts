import { duelMultiplier, resolveDuelRound } from '../src/index';

test('duelMultiplier fica em 1 até a rodada de início e sobe pelo passo', () => {
  expect([1, 4, 5, 6].map((r) => duelMultiplier(r, 5, 0.5))).toEqual([1, 1, 1.5, 2]);
});

test('resolveDuelRound aplica a diferença × multiplicador no time com menos pontos', () => {
  expect(resolveDuelRound({ A: 4000, B: 3000 }, { A: 6000, B: 6000 }, 1.5)).toEqual({
    teamScores: { A: 4000, B: 3000 }, damagedTeam: 'B', damage: 1500, hp: { A: 6000, B: 4500 }, multiplier: 1.5,
  });
});

test('vida não fica negativa', () => {
  expect(resolveDuelRound({ A: 0, B: 5000 }, { A: 1000, B: 6000 }, 1).hp.A).toBe(0);
});

test('empate não causa dano', () => {
  const r = resolveDuelRound({ A: 2000, B: 2000 }, { A: 6000, B: 6000 }, 1);
  expect(r.damagedTeam).toBeNull();
  expect(r.damage).toBe(0);
});
