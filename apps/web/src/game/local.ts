import {
  createDeck,
  roundPoints,
  scoreGuess,
  type Avatar,
  type GameMap,
  type LatLng,
  type MapPoint,
  type Movement,
  type Scoring,
} from '@onde-to/shared';

export type GuessMode = 'turns' | 'same-map';

export interface LocalPlayer {
  id: string;
  nick: string;
  avatar: Avatar;
}

export interface LocalSettings {
  mapId: string;
  rounds: number;
  timeSec: number | null;
  movement: Movement;
  guessMode: GuessMode;
  scoring: Scoring;
}

export interface LocalGuess {
  playerId: string;
  guess: LatLng | null;
  distanceKm: number | null;
  score: number;
  points: number;
}

export interface LocalRoundResult {
  round: number;
  answer: MapPoint;
  guesses: LocalGuess[];
}

interface Playing {
  settings: LocalSettings;
  map: GameMap;
  players: LocalPlayer[];
  /** Pontos ainda não usados, já embaralhados (imutável: o reducer pode rodar duas vezes no StrictMode). */
  queue: MapPoint[];
  round: number;
  point: MapPoint;
  /** Ordem de jogo da rodada (gira 1 posição a cada rodada). */
  order: string[];
  deadline: number | null;
  /** Palpites confirmados (turnos) ou marcados (mesmo mapa) da rodada atual. */
  pending: Record<string, LatLng | null>;
  totals: Record<string, number>;
  history: LocalRoundResult[];
}

export type LocalState =
  | { phase: 'setup' }
  | ({ phase: 'gate'; turnIndex: number } & Playing)
  | ({ phase: 'guessing'; turnIndex: number; activeId: string } & Playing)
  | ({ phase: 'result'; last: LocalRoundResult } & Playing)
  | {
      phase: 'final';
      settings: LocalSettings;
      map: GameMap;
      players: LocalPlayer[];
      history: LocalRoundResult[];
      totals: Record<string, number>;
      winners: string[];
    };

export type LocalAction =
  | { type: 'start'; settings: LocalSettings; players: LocalPlayer[]; map: GameMap; rng: () => number; now: number }
  | { type: 'ready'; now: number }
  | { type: 'select'; playerId: string }
  | { type: 'place'; guess: LatLng }
  | { type: 'guess'; guess: LatLng | null; now: number }
  | { type: 'reveal' }
  | { type: 'timeout' }
  | { type: 'next'; now: number }
  | { type: 'skip'; now: number }
  | { type: 'setup' };

const deadlineFrom = (s: LocalSettings, now: number) => (s.timeSec ? now + s.timeSec * 1000 : null);
const solo = (p: Playing) => p.players.length === 1;
const usesTurns = (p: Playing) => !solo(p) && p.settings.guessMode === 'turns';

function shuffled(points: MapPoint[], rng: () => number): MapPoint[] {
  const deck = createDeck(points, rng);
  const out: MapPoint[] = [];
  for (let p = deck.draw(); p; p = deck.draw()) out.push(p);
  return out;
}

/** Começo de rodada (nova ou trocada por foto quebrada): turnos → tela de vez; senão → palpite. */
function beginRound(base: Playing, now: number): LocalState {
  const p: Playing = { ...base, pending: {} };
  if (usesTurns(p)) return { ...p, phase: 'gate', turnIndex: 0, deadline: null };
  return { ...p, phase: 'guessing', turnIndex: 0, activeId: p.order[0], deadline: deadlineFrom(p.settings, now) };
}

function playing(s: Extract<LocalState, { phase: 'gate' | 'guessing' | 'result' }>): Playing {
  const { settings, map, players, queue, round, point, order, deadline, pending, totals, history } = s;
  return { settings, map, players, queue, round, point, order, deadline, pending, totals, history };
}

function finishRound(p: Playing): LocalState {
  const base = p.players.map((pl) => {
    const guess = p.pending[pl.id] ?? null;
    const { distanceKm, score } = scoreGuess(guess, p.point, p.map.tamanhoKm);
    return { playerId: pl.id, guess, distanceKm, score };
  });
  const pts = roundPoints(base);
  const guesses: LocalGuess[] = base.map((g) => ({ ...g, points: pts[g.playerId] }));
  const totals = { ...p.totals };
  for (const g of guesses) totals[g.playerId] = (totals[g.playerId] ?? 0) + (p.settings.scoring === 'rounds' ? g.points : g.score);
  const last: LocalRoundResult = { round: p.round, answer: p.point, guesses };
  return { ...p, phase: 'result', last, totals, history: [...p.history, last], deadline: null };
}

function finalState(p: Playing): LocalState {
  const best = Math.max(...p.players.map((pl) => p.totals[pl.id] ?? 0));
  return {
    phase: 'final',
    settings: p.settings,
    map: p.map,
    players: p.players,
    history: p.history,
    totals: p.totals,
    winners: p.players.filter((pl) => (p.totals[pl.id] ?? 0) === best).map((pl) => pl.id),
  };
}

export function localReducer(state: LocalState, action: LocalAction): LocalState {
  switch (action.type) {
    case 'setup':
      return { phase: 'setup' };

    case 'start': {
      if (action.players.length === 0) return state;
      const [point, ...queue] = shuffled(action.map.pontos, action.rng);
      if (!point) return state;
      const base: Playing = {
        settings: action.settings,
        map: action.map,
        players: action.players,
        queue,
        round: 1,
        point,
        order: action.players.map((p) => p.id),
        deadline: null,
        pending: {},
        totals: Object.fromEntries(action.players.map((p) => [p.id, 0])),
        history: [],
      };
      return beginRound(base, action.now);
    }

    case 'ready': {
      if (state.phase !== 'gate') return state;
      return {
        ...playing(state),
        phase: 'guessing',
        turnIndex: state.turnIndex,
        activeId: state.order[state.turnIndex],
        deadline: deadlineFrom(state.settings, action.now),
      };
    }

    case 'select': {
      if (state.phase !== 'guessing' || usesTurns(state) || !state.players.some((p) => p.id === action.playerId)) return state;
      return { ...state, activeId: action.playerId };
    }

    case 'place': {
      if (state.phase !== 'guessing' || usesTurns(state)) return state;
      return { ...state, pending: { ...state.pending, [state.activeId]: action.guess } };
    }

    case 'guess': {
      if (state.phase !== 'guessing') return state;
      const p = { ...playing(state), pending: { ...state.pending, [state.activeId]: action.guess } };
      if (usesTurns(state) && state.turnIndex + 1 < state.order.length) {
        return { ...p, phase: 'gate', turnIndex: state.turnIndex + 1, deadline: null };
      }
      return finishRound(p);
    }

    case 'reveal': {
      if (state.phase !== 'guessing' || usesTurns(state)) return state;
      const allPlaced = state.players.every((pl) => state.pending[pl.id]);
      return allPlaced ? finishRound(playing(state)) : state;
    }

    case 'timeout': {
      if (state.phase !== 'guessing' || usesTurns(state)) return state;
      return finishRound(playing(state));
    }

    case 'next': {
      if (state.phase !== 'result') return state;
      const p = playing(state);
      const [point, ...queue] = p.queue;
      if (p.round >= p.settings.rounds || !point) return finalState(p);
      const order = [...p.order.slice(1), p.order[0]];
      return beginRound({ ...p, round: p.round + 1, point, queue, order }, action.now);
    }

    case 'skip': {
      if (state.phase !== 'guessing' && state.phase !== 'gate') return state;
      const p = playing(state);
      const [point, ...queue] = p.queue;
      if (!point) return state;
      return beginRound({ ...p, point, queue }, action.now);
    }
  }
}

/** Pinos que o mapa de palpite pode mostrar agora. Em turnos, nunca os dos outros (Review Focus #1). */
export function visiblePins(s: LocalState): { playerId: string; guess: LatLng }[] {
  if (s.phase !== 'guessing' || usesTurns(s) || solo(s)) return [];
  return s.players.flatMap((pl) => {
    const g = s.pending[pl.id];
    return g ? [{ playerId: pl.id, guess: g }] : [];
  });
}
