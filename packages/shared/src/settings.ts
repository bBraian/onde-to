export type GameMode = 'classic' | 'duel';
export type Movement = 'move' | 'no-move' | 'nmpz';
export type Scoring = 'distance' | 'rounds';

export interface RoomSettings {
  mapId: string;
  mode: GameMode;
  rounds: number;
  roundTimeSec: number | null;
  movement: Movement;
  duelStartHp: number;
  duelGuessCountdownSec: number;
  duelMultiplierStartRound: number;
  duelMultiplierStep: number;
  autoAdvanceSec: number | null;
  scoring: Scoring;
}

export const DEFAULT_SETTINGS: RoomSettings = {
  mapId: 'brasil',
  mode: 'classic',
  rounds: 5,
  roundTimeSec: 120,
  movement: 'move',
  duelStartHp: 6000,
  duelGuessCountdownSec: 15,
  duelMultiplierStartRound: 5,
  duelMultiplierStep: 0.5,
  autoAdvanceSec: 30,
  scoring: 'distance',
};

const MODES: GameMode[] = ['classic', 'duel'];
const MOVEMENTS: Movement[] = ['move', 'no-move', 'nmpz'];
const SCORINGS: Scoring[] = ['distance', 'rounds'];

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

function num(v: unknown, base: number, min: number, max: number, integer: boolean): number {
  if (!isNum(v)) return base;
  const n = clamp(v, min, max);
  return integer ? Math.round(n) : Math.round(n * 10) / 10;
}

function nullableNum(v: unknown, base: number | null, min: number, max: number): number | null {
  if (v === null) return null;
  if (v === undefined) return base;
  return isNum(v) ? Math.round(clamp(v, min, max)) : base;
}

/** Aplica `input` sobre `base`, ajustando números às faixas da spec e ignorando valores inválidos. */
export function sanitizeSettings(
  input: Partial<RoomSettings>,
  base: RoomSettings,
  allowedMapIds: string[],
): RoomSettings {
  const i = (input ?? {}) as Record<string, unknown>;
  return {
    mapId: typeof i.mapId === 'string' && allowedMapIds.includes(i.mapId) ? i.mapId : base.mapId,
    mode: MODES.includes(i.mode as GameMode) ? (i.mode as GameMode) : base.mode,
    rounds: num(i.rounds, base.rounds, 1, 20, true),
    roundTimeSec: nullableNum(i.roundTimeSec, base.roundTimeSec, 10, 600),
    movement: MOVEMENTS.includes(i.movement as Movement) ? (i.movement as Movement) : base.movement,
    duelStartHp: num(i.duelStartHp, base.duelStartHp, 1000, 20000, true),
    duelGuessCountdownSec: num(i.duelGuessCountdownSec, base.duelGuessCountdownSec, 5, 60, true),
    duelMultiplierStartRound: num(i.duelMultiplierStartRound, base.duelMultiplierStartRound, 2, 10, true),
    duelMultiplierStep: num(i.duelMultiplierStep, base.duelMultiplierStep, 0.1, 1.0, false),
    autoAdvanceSec: nullableNum(i.autoAdvanceSec, base.autoAdvanceSec, 10, 120),
    scoring: SCORINGS.includes(i.scoring as Scoring) ? (i.scoring as Scoring) : base.scoring,
  };
}
