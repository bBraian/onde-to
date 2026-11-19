export type TeamId = 'A' | 'B';

export function duelMultiplier(round: number, startRound: number, step: number): number {
  if (round < startRound) return 1;
  return Math.round((1 + step * (round - startRound + 1)) * 100) / 100;
}

export interface DuelRoundOutcome {
  teamScores: Record<TeamId, number>;
  damagedTeam: TeamId | null;
  damage: number;
  hp: Record<TeamId, number>;
  multiplier: number;
}

export function resolveDuelRound(
  teamScores: Record<TeamId, number>,
  hp: Record<TeamId, number>,
  multiplier: number,
): DuelRoundOutcome {
  const diff = Math.abs(teamScores.A - teamScores.B);
  const damagedTeam: TeamId | null = diff === 0 ? null : teamScores.A < teamScores.B ? 'A' : 'B';
  const damage = damagedTeam ? Math.round(diff * multiplier) : 0;
  const next = { ...hp };
  if (damagedTeam) next[damagedTeam] = Math.max(0, next[damagedTeam] - damage);
  return { teamScores: { ...teamScores }, damagedTeam, damage, hp: next, multiplier };
}
