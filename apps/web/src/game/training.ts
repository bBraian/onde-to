import { createDeck, scoreGuess, type GameMap, type GuessResult, type LatLng, type MapPoint } from '@onde-to/shared';
import type { RecordSettings } from '../lib/records';

export type TrainingSettings = RecordSettings;
export type TrainingRoundResult = GuessResult & { answer: MapPoint };

interface Playing {
  settings: TrainingSettings;
  map: GameMap;
  /** Pontos ainda não usados, já embaralhados (imutável: o reducer pode rodar duas vezes no StrictMode). */
  queue: MapPoint[];
  round: number;
  point: MapPoint;
  deadline: number | null;
  results: TrainingRoundResult[];
}

export type TrainingState =
  | { phase: 'setup' }
  | ({ phase: 'round' } & Playing)
  | ({ phase: 'result' } & Playing)
  | { phase: 'summary'; settings: TrainingSettings; map: GameMap; results: TrainingRoundResult[]; total: number };

export type TrainingAction =
  | { type: 'start'; settings: TrainingSettings; map: GameMap; rng: () => number; now: number }
  | { type: 'guess'; guess: LatLng | null }
  | { type: 'next'; now: number }
  | { type: 'skip'; now: number }
  | { type: 'setup' };

const deadlineFrom = (s: TrainingSettings, now: number) => (s.roundTimeSec ? now + s.roundTimeSec * 1000 : null);

function shuffled(points: MapPoint[], rng: () => number): MapPoint[] {
  const deck = createDeck(points, rng);
  const out: MapPoint[] = [];
  for (let p = deck.draw(); p; p = deck.draw()) out.push(p);
  return out;
}

const summary = (s: Playing): TrainingState => ({
  phase: 'summary',
  settings: s.settings,
  map: s.map,
  results: s.results,
  total: s.results.reduce((sum, r) => sum + r.score, 0),
});

export function trainingReducer(state: TrainingState, action: TrainingAction): TrainingState {
  switch (action.type) {
    case 'setup':
      return { phase: 'setup' };

    case 'start': {
      const [point, ...queue] = shuffled(action.map.pontos, action.rng);
      if (!point) return state;
      return {
        phase: 'round', settings: action.settings, map: action.map, queue, round: 1, point,
        deadline: deadlineFrom(action.settings, action.now), results: [],
      };
    }

    case 'guess': {
      if (state.phase !== 'round') return state;
      const { distanceKm, score } = scoreGuess(action.guess, state.point, state.map.tamanhoKm);
      const result: TrainingRoundResult = { playerId: 'me', guess: action.guess, distanceKm, score, answer: state.point };
      return { ...state, phase: 'result', results: [...state.results, result] };
    }

    case 'next': {
      if (state.phase !== 'result') return state;
      const [point, ...queue] = state.queue;
      if (state.round >= state.settings.rounds || !point) return summary(state);
      return { ...state, phase: 'round', round: state.round + 1, point, queue, deadline: deadlineFrom(state.settings, action.now) };
    }

    case 'skip': {
      if (state.phase !== 'round') return state;
      const [point, ...queue] = state.queue;
      if (!point) return state;
      return { ...state, point, queue, deadline: deadlineFrom(state.settings, action.now) };
    }
  }
}
