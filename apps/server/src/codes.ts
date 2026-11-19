export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const NICK_MAX = 20;

export function generateCode(rng: () => number, taken: Set<string>): string {
  for (;;) {
    let code = '';
    for (let i = 0; i < 4; i++) code += CODE_ALPHABET[Math.floor(rng() * CODE_ALPHABET.length)];
    if (!taken.has(code)) return code;
  }
}

export function normalizeCode(input: string): string {
  return String(input ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** trim, espaços colapsados, até 20 caracteres; null se vazio; sufixo " (n)" se já existir (sem diferenciar maiúsculas). */
export function sanitizeNick(input: string, existing: string[]): string | null {
  if (typeof input !== 'string') return null;
  const base = input.trim().replace(/\s+/g, ' ').slice(0, NICK_MAX).trim();
  if (!base) return null;
  const taken = new Set(existing.map((n) => n.toLowerCase()));
  if (!taken.has(base.toLowerCase())) return base;
  for (let n = 2; ; n++) {
    const suffix = ` (${n})`;
    const candidate = base.slice(0, NICK_MAX - suffix.length).trimEnd() + suffix;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
}
