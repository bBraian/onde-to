import { useEffect, useRef, useState } from 'react';
import { formatClock, remainingSec } from '../lib/clock';

interface Props {
  deadline: number;
  offsetMs?: number;
  onExpire?: () => void;
  className?: string;
}

/** Recalcula a partir do deadline a cada 250 ms — nunca decrementa um contador, então aba em segundo plano não atrasa. */
export function Countdown({ deadline, offsetMs = 0, onExpire, className }: Props) {
  const [left, setLeft] = useState(() => remainingSec(deadline, Date.now(), offsetMs));
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    let fired = false;
    const tick = () => {
      const s = remainingSec(deadline, Date.now(), offsetMs);
      setLeft(s);
      if (s === 0 && !fired) {
        fired = true;
        onExpireRef.current?.();
      }
    };
    tick();
    const id = window.setInterval(tick, 250);
    const onVisible = () => tick();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [deadline, offsetMs]);

  return (
    <div role="timer" aria-label={`Tempo restante: ${left} segundos`} className={className ?? 'hud-timer'} data-urgent={left <= 10 ? 'true' : undefined}>
      <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="13" r="8" />
        <path d="M12 9v4l2.5 2M9 3h6" />
      </svg>
      <span>{formatClock(left)}</span>
    </div>
  );
}
