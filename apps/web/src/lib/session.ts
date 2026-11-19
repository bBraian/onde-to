import { safeStorage } from './storage';

const SESSION_KEY = 'onde-to:session';
const NICK_KEY = 'onde-to:nick';

function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const h = () => Math.floor(Math.random() * 16).toString(16);
  return 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, h);
}

export function getSession(): string {
  let s = safeStorage.get(SESSION_KEY);
  if (!s) {
    s = uuid();
    safeStorage.set(SESSION_KEY, s);
  }
  return s;
}

export function getNick(): string {
  return safeStorage.get(NICK_KEY) ?? '';
}

export function setNick(nick: string): void {
  safeStorage.set(NICK_KEY, nick);
}
