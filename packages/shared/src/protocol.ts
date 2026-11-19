import type { LatLng } from './geo';
import type { TeamId, DuelRoundOutcome } from './duel';
import type { MapPoint, StreetProvider } from './maps';
import type { Avatar } from './avatar';
import type { RoomSettings } from './settings';

export type Phase = 'lobby' | 'round' | 'result' | 'finished';

export interface PlayerView {
  id: string;
  nick: string;
  avatar: Avatar;
  team: TeamId | null;
  isHost: boolean;
  connected: boolean;
  spectator: boolean;
  hasGuessed: boolean;
  total: number;
}

export interface GuessResult {
  playerId: string;
  guess: LatLng | null;
  distanceKm: number | null;
  score: number;
}

export interface RoundResultView {
  round: number;
  answer: MapPoint;
  guesses: GuessResult[];
  duel: DuelRoundOutcome | null;
}

export interface RoomView {
  code: string;
  phase: Phase;
  settings: RoomSettings;
  players: PlayerView[];
  round: { number: number; imageId: string; deadline: number | null } | null;
  result: RoundResultView | null;
  history: RoundResultView[];
  duelHp: Record<TeamId, number> | null;
  nextAt: number | null;
  winner: { playerIds: string[] } | { team: TeamId } | null;
  serverNow: number;
  provider: StreetProvider;
}

export type JoinAck =
  | { ok: true; code: string; playerId: string }
  | { ok: false; error: 'not_found' | 'full' | 'invalid_nick' };

export interface ClientToServerEvents {
  'room:create': (p: { nick: string; session: string; avatar?: Avatar }, ack: (r: JoinAck) => void) => void;
  'room:join': (p: { code: string; nick: string; session: string; avatar?: Avatar }, ack: (r: JoinAck) => void) => void;
  'room:avatar': (p: Avatar) => void;
  'room:nick': (nick: string) => void;
  'room:leave': () => void;
  'room:settings': (p: Partial<RoomSettings>) => void;
  'room:team': (p: { playerId: string; team: TeamId }) => void;
  'room:start': () => void;
  'room:lobby': () => void;
  'round:guess': (p: LatLng) => void;
  'round:end': () => void;
  'round:reroll': () => void;
  'round:next': () => void;
}

export interface ServerToClientEvents {
  'room:state': (view: RoomView) => void;
}
