import type { Movement } from '@onde-to/shared';
import { safeStorage } from './storage';

const KEY = 'onde-to:records';

export interface RecordSettings {
  mapId: string;
  rounds: number;
  roundTimeSec: number | null;
  movement: Movement;
}

export function recordKey(s: RecordSettings): string {
  return `${s.mapId}|${s.rounds}|${s.roundTimeSec ?? 'inf'}|${s.movement}`;
}

function readAll(): Record<string, number> {
  try {
    const parsed = JSON.parse(safeStorage.get(KEY) ?? '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveRecord(key: string, total: number): { best: number; isNew: boolean } {
  const all = readAll();
  const prev = all[key];
  if (typeof prev === 'number' && prev >= total) return { best: prev, isNew: false };
  all[key] = total;
  safeStorage.set(KEY, JSON.stringify(all));
  return { best: total, isNew: true };
}
