/** Segundos inteiros que faltam até `deadline`, usando a diferença de relógio servidor − local. */
export function remainingSec(deadline: number, now: number, offsetMs = 0): number {
  return Math.max(0, Math.ceil((deadline - (now + offsetMs)) / 1000));
}

export function formatClock(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
