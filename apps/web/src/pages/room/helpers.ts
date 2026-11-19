import type { PlayerView, RoomView, TeamId } from '@onde-to/shared';

export const TEAM_COLOR: Record<TeamId, string> = { A: '#B8461A', B: '#2563C9' };
export const TEAM_NAME: Record<TeamId, string> = { A: 'Time A', B: 'Time B' };
const PALETTE = ['#B8461A', '#2563C9', '#6B5BA8', '#1F6B4F', '#9A6A00', '#0E7490', '#BE185D', '#4D7C0F'];

export const isDuel = (v: RoomView) => v.settings.mode === 'duel';

export function playerColor(v: RoomView, playerId: string): string {
  const idx = v.players.findIndex((p) => p.id === playerId);
  const p = v.players[idx];
  if (isDuel(v) && p?.team) return TEAM_COLOR[p.team];
  return PALETTE[(idx < 0 ? 0 : idx) % PALETTE.length];
}

export const activePlayers = (v: RoomView) => v.players.filter((p) => !p.spectator);

export function canStart(v: RoomView): boolean {
  const active = activePlayers(v);
  if (active.length === 0) return false;
  if (!isDuel(v)) return true;
  return (['A', 'B'] as TeamId[]).every((t) => active.some((p) => p.team === t));
}

export function isLastRound(v: RoomView): boolean {
  if (isDuel(v)) return !!v.duelHp && (v.duelHp.A <= 0 || v.duelHp.B <= 0);
  return (v.round?.number ?? 0) >= v.settings.rounds;
}

export const nickOf = (v: RoomView, id: string) => v.players.find((p) => p.id === id)?.nick ?? '—';

export const sortByTotal = (players: PlayerView[]) => [...players].sort((a, b) => b.total - a.total);
