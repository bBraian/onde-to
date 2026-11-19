import type { PlayerView, RoomView } from '@onde-to/shared';
import { DEFAULT_SETTINGS } from '@onde-to/shared';
import { canStart, playerColor, isLastRound } from '../src/pages/room/helpers';

const p = (id: string, team: 'A' | 'B', extra: Partial<PlayerView> = {}): PlayerView => ({
  id, nick: id, team, isHost: false, connected: true, spectator: false, hasGuessed: false, total: 0, ...extra,
});
const view = (over: Partial<RoomView>): RoomView => ({
  code: 'K7QX', phase: 'lobby', settings: DEFAULT_SETTINGS, players: [], round: null, result: null, history: [],
  duelHp: null, nextAt: null, winner: null, serverNow: 0, ...over,
});

test('canStart: duelo exige gente nos dois times', () => {
  const duel = { ...DEFAULT_SETTINGS, mode: 'duel' as const };
  expect(canStart(view({ settings: duel, players: [p('a', 'A'), p('b', 'A')] }))).toBe(false);
  expect(canStart(view({ settings: duel, players: [p('a', 'A'), p('b', 'B')] }))).toBe(true);
  expect(canStart(view({ players: [p('a', 'A')] }))).toBe(true);
});

test('playerColor usa a cor do time no duelo e paleta por jogador no clássico', () => {
  const players = [p('a', 'A'), p('b', 'A')];
  const duel = view({ settings: { ...DEFAULT_SETTINGS, mode: 'duel' }, players });
  expect(playerColor(duel, 'a')).toBe(playerColor(duel, 'b'));
  const classic = view({ players });
  expect(playerColor(classic, 'a')).not.toBe(playerColor(classic, 'b'));
});

test('isLastRound', () => {
  expect(isLastRound(view({ phase: 'result', round: { number: 5, imageId: 'x', deadline: null } }))).toBe(true);
  expect(isLastRound(view({ phase: 'result', round: { number: 4, imageId: 'x', deadline: null } }))).toBe(false);
  const duel = { ...DEFAULT_SETTINGS, mode: 'duel' as const };
  expect(isLastRound(view({ settings: duel, phase: 'result', duelHp: { A: 0, B: 300 }, round: { number: 2, imageId: 'x', deadline: null } }))).toBe(true);
});
