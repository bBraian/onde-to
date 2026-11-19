import { useEffect, useState } from 'react';
import type { TeamId } from '@onde-to/shared';
import { formatPoints } from '../lib/format';
import { prefersReducedMotion } from '../lib/motion';

interface Props {
  hp: Record<TeamId, number>;
  startHp: number;
  /** Vida antes do dano: a barra começa aqui e desce animada até `hp`. */
  from?: Record<TeamId, number>;
  shakeTeam?: TeamId | null;
}

/** Barras de vida do Duelo. A barra anima por transform (scaleX); o time atingido treme. */
export function HpBars({ hp, startHp, from, shakeTeam }: Props) {
  const [shown, setShown] = useState(() => (from && !prefersReducedMotion() ? from : hp));
  useEffect(() => {
    if (!from || prefersReducedMotion()) {
      setShown(hp);
      return;
    }
    // espera o primeiro quadro pintar no valor antigo para a transição de scaleX acontecer
    const id = window.setTimeout(() => setShown(hp), 30);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hp.A, hp.B]);

  return (
    <div className="hp-bars">
      {(['A', 'B'] as TeamId[]).map((t) => (
        <div key={t} className="hp-row">
          <span className={`hp-name hp-name-${t}`}>Time {t}</span>
          <div className={`hp-track${shakeTeam === t ? ' shake' : ''}`} role="meter" aria-label={`Vida do Time ${t}`} aria-valuemin={0} aria-valuemax={startHp} aria-valuenow={hp[t]}>
            <div className={`hp-fill hp-fill-${t}`} style={{ transform: `scaleX(${Math.max(0, Math.min(1, shown[t] / startHp))})` }} />
          </div>
          <span className="hp-value">{formatPoints(hp[t])}</span>
        </div>
      ))}
    </div>
  );
}
