import { DEFAULT_SETTINGS, sanitizeSettings } from '../src/index';

test('defaults da spec', () => {
  expect(DEFAULT_SETTINGS).toEqual({
    mapId: 'brasil', mode: 'classic', rounds: 5, roundTimeSec: 120, movement: 'move',
    duelStartHp: 6000, duelGuessCountdownSec: 15, duelMultiplierStartRound: 5, duelMultiplierStep: 0.5, autoAdvanceSec: 30,
  });
});

test('sanitizeSettings ajusta ao limite e ignora inválidos', () => {
  const s = sanitizeSettings(
    { rounds: 50, roundTimeSec: 3, mode: 'x' as any, mapId: 'nope', autoAdvanceSec: null },
    DEFAULT_SETTINGS, ['brasil'],
  );
  expect(s.rounds).toBe(20);
  expect(s.roundTimeSec).toBe(10);
  expect(s.mode).toBe('classic');
  expect(s.mapId).toBe('brasil');
  expect(s.autoAdvanceSec).toBeNull();
});

test('sanitizeSettings aceita valores válidos e ajusta os limites inferiores do duelo', () => {
  const s = sanitizeSettings(
    { mode: 'duel', movement: 'nmpz', mapId: 'mundo', roundTimeSec: null, duelStartHp: 10, duelGuessCountdownSec: 999,
      duelMultiplierStartRound: 1, duelMultiplierStep: 3, rounds: 2.6 },
    DEFAULT_SETTINGS, ['brasil', 'mundo'],
  );
  expect(s).toMatchObject({ mode: 'duel', movement: 'nmpz', mapId: 'mundo', roundTimeSec: null, duelStartHp: 1000,
    duelGuessCountdownSec: 60, duelMultiplierStartRound: 2, duelMultiplierStep: 1, rounds: 3 });
});

test('sanitizeSettings ignora tipos errados', () => {
  const s = sanitizeSettings({ rounds: '7' as any, roundTimeSec: NaN, autoAdvanceSec: 'x' as any }, DEFAULT_SETTINGS, ['brasil']);
  expect(s.rounds).toBe(5);
  expect(s.roundTimeSec).toBe(120);
  expect(s.autoAdvanceSec).toBe(30);
});
