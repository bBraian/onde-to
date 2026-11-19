import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { DEFAULT_SETTINGS, type RoomView } from '@onde-to/shared';

vi.mock('../src/components/ResultMap', () => ({ ResultMap: () => null }));
const { RoundResult } = await import('../src/pages/room/RoundResult');
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const answer = { imageId: 'img-1', lat: -23.5, lng: -46.6, regiao: 'SP' };
const view: RoomView = {
  code: 'K7QX', phase: 'result', settings: { ...DEFAULT_SETTINGS, mode: 'duel', mapId: 'teste' },
  players: [
    { id: 'a', nick: 'Ana', team: 'A', isHost: true, connected: true, spectator: false, hasGuessed: false, total: 4413 },
    { id: 'b', nick: 'Bia', team: 'B', isHost: false, connected: true, spectator: false, hasGuessed: false, total: 1887 },
  ],
  round: { number: 2, imageId: 'img-1', deadline: null },
  result: {
    round: 2, answer,
    guesses: [
      { playerId: 'a', guess: { lat: -23, lng: -46 }, distanceKm: 74, score: 4413 },
      { playerId: 'b', guess: { lat: -20, lng: -44 }, distanceKm: 390, score: 1887 },
    ],
    duel: { teamScores: { A: 4413, B: 1887 }, damagedTeam: 'B', damage: 2526, hp: { A: 6000, B: 3474 }, multiplier: 1 },
  },
  history: [], duelHp: { A: 6000, B: 3474 }, nextAt: null, winner: null, serverNow: 0,
};

test('resultado do duelo mostra os pontos de cada time', async () => {
  const el = document.createElement('div');
  const root = createRoot(el);
  await act(async () => { root.render(<RoundResult view={view} me="a" offsetMs={0} send={() => {}} />); });
  const text = el.querySelector('[data-testid="team-scores"]')?.textContent ?? '';
  expect(text).toContain('Time A');
  expect(text).toContain('4.413');
  expect(text).toContain('Time B');
  expect(text).toContain('1.887');
  root.unmount();
});
