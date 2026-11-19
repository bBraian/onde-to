import type { TeamId } from '@onde-to/shared';

/** Etiqueta do time no Duelo (o avatar mantém a própria cor). */
export function TeamTag({ team }: { team: TeamId }) {
  return (
    <span className="team-tag" data-team={team} role="img" aria-label={`Time ${team}`}>
      {team}
    </span>
  );
}
