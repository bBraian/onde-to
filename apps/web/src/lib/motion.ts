import { useEffect, useState } from 'react';
import { animate } from 'motion';
import confetti from 'canvas-confetti';
import { AVATAR_COLORS } from '@onde-to/shared';

/** Curvas fortes (Emil Kowalski) — as mesmas de --ease-out / --ease-in-out no CSS. */
export const EASE_OUT = [0.23, 1, 0.32, 1] as const;
export const EASE_IN_OUT = [0.77, 0, 0.175, 1] as const;

export function prefersReducedMotion(): boolean {
  try {
    return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** Conta de 0 até `target` (≤ 800 ms, ease-out). Com "reduzir movimento", mostra o valor final na hora. */
export function useCountUp(target: number, durationMs = 800): number {
  const [value, setValue] = useState(() => (prefersReducedMotion() ? target : 0));
  useEffect(() => {
    if (prefersReducedMotion()) {
      setValue(target);
      return;
    }
    const controls = animate(0, target, {
      duration: Math.min(durationMs, 800) / 1000,
      ease: EASE_OUT,
      onUpdate: (v) => setValue(Math.round(v)),
    });
    return () => controls.stop();
  }, [target, durationMs]);
  return value;
}

const COLORS = AVATAR_COLORS.map((c) => c.hex);

/** Confete de comemoração (pódio, 5000 perfeito). Nada com "reduzir movimento". */
export function celebrate(kind: 'podium' | 'perfect'): void {
  if (prefersReducedMotion()) return;
  try {
    if (kind === 'podium') {
      confetti({ particleCount: 140, spread: 90, startVelocity: 45, origin: { y: 0.65 }, colors: COLORS, disableForReducedMotion: true });
    } else {
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.7 }, colors: COLORS, disableForReducedMotion: true });
    }
  } catch {
    /* canvas indisponível: sem confete */
  }
}
