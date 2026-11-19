import { DEFAULT_AVATAR, randomAvatar, sanitizeAvatar, type Avatar } from '@onde-to/shared';
import { safeStorage } from '../lib/storage';

const KEY = 'onde-to:avatar';

/** Avatar salvo; na primeira visita sorteia um e guarda. Valor corrompido vira o padrão. */
export function getAvatar(): Avatar {
  const raw = safeStorage.get(KEY);
  if (raw === null) {
    const a = randomAvatar(Math.random);
    setAvatar(a);
    return a;
  }
  try {
    return sanitizeAvatar(JSON.parse(raw));
  } catch {
    return DEFAULT_AVATAR;
  }
}

export function setAvatar(a: Avatar): void {
  safeStorage.set(KEY, JSON.stringify(sanitizeAvatar(a)));
}
