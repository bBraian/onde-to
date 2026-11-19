import { useEffect, useState } from 'react';
import { remainingSec } from '../../lib/clock';

/** "Começa sozinha em N s" a partir do nextAt do servidor. */
export function AutoNext({ at, offsetMs, label }: { at: number; offsetMs: number; label: string }) {
  const [left, setLeft] = useState(() => remainingSec(at, Date.now(), offsetMs));
  useEffect(() => {
    const id = window.setInterval(() => setLeft(remainingSec(at, Date.now(), offsetMs)), 250);
    return () => window.clearInterval(id);
  }, [at, offsetMs]);
  return <p className="muted center-text">{label} em {left} s</p>;
}
