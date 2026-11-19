import type { TeamId } from '@onde-to/shared';
import { formatPoints } from '../lib/format';

/** Barras de vida do Duelo. A barra anima por transform (scaleX); o time atingido treme (`shakeTeam`). */
export function HpBars({ hp, startHp, shakeTeam }: { hp: Record<TeamId, number>; startHp: number; shakeTeam?: TeamId | null }) {
  return (
    <div className="hp-bars">
      {(['A', 'B'] as TeamId[]).map((t) => (
        <div key={t} className="hp-row">
          <span className={`hp-name hp-name-${t}`}>Time {t}</span>
          <div
            className={`hp-track${shakeTeam === t ? ' shake' : ''}`}
            role="meter"
            aria-label={`Vida do Time ${t}`}
            aria-valuemin={0}
            aria-valuemax={startHp}
            aria-valuenow={hp[t]}
          >
            <div className={`hp-fill hp-fill-${t}`} style={{ transform: `scaleX(${Math.max(0, Math.min(1, hp[t] / startHp))})` }} />
          </div>
          <span className="hp-value">{formatPoints(hp[t])}</span>
        </div>
      ))}
    </div>
  );
}
