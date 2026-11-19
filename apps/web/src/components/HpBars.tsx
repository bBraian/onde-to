import type { TeamId } from '@onde-to/shared';
import { formatPoints } from '../lib/format';

export function HpBars({ hp, startHp, dark }: { hp: Record<TeamId, number>; startHp: number; dark?: boolean }) {
  return (
    <div className={dark ? 'hp-bars hp-dark' : 'hp-bars'}>
      {(['A', 'B'] as TeamId[]).map((t) => (
        <div key={t} className="hp-row">
          <span className={`hp-name hp-name-${t}`}>Time {t}</span>
          <div
            className="hp-track"
            role="meter"
            aria-label={`Vida do Time ${t}`}
            aria-valuemin={0}
            aria-valuemax={startHp}
            aria-valuenow={hp[t]}
          >
            <div className={`hp-fill hp-fill-${t}`} style={{ width: `${Math.max(0, Math.min(100, (hp[t] / startHp) * 100))}%` }} />
          </div>
          <span className="hp-value">{formatPoints(hp[t])}</span>
        </div>
      ))}
    </div>
  );
}
