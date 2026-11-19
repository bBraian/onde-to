import { sanitizeAvatar, sanitizeSettings, DEFAULT_SETTINGS } from '@onde-to/shared';
import type { LocalPlayer, LocalSettings } from '../game/local';
import { getAvatar } from '../avatar/storage';
import { getNick } from './session';
import { safeStorage } from './storage';

const KEY = 'onde-to:local';
export const MAX_LOCAL_PLAYERS = 8;

export const DEFAULT_LOCAL_SETTINGS: Omit<LocalSettings, 'mapId'> = {
  rounds: 5,
  timeSec: null,
  movement: 'move',
  guessMode: 'turns',
  scoring: 'distance',
};

export interface LocalSetup {
  players: LocalPlayer[];
  settings: LocalSettings;
}

const playerName = (nick: unknown, i: number) => {
  const n = typeof nick === 'string' ? nick.trim().replace(/\s+/g, ' ').slice(0, 20) : '';
  return n || `Jogador ${i + 1}`;
};

function sanitizeSettingsLocal(raw: unknown): LocalSettings {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  // reaproveita as faixas da sala para rodadas, tempo e movimento
  const room = sanitizeSettings(
    { rounds: o.rounds as number, roundTimeSec: o.timeSec as number | null, movement: o.movement as LocalSettings['movement'], scoring: o.scoring as LocalSettings['scoring'] },
    { ...DEFAULT_SETTINGS, rounds: DEFAULT_LOCAL_SETTINGS.rounds, roundTimeSec: DEFAULT_LOCAL_SETTINGS.timeSec, scoring: DEFAULT_LOCAL_SETTINGS.scoring },
    [],
  );
  return {
    mapId: typeof o.mapId === 'string' ? o.mapId : '',
    rounds: room.rounds,
    timeSec: room.roundTimeSec,
    movement: room.movement,
    guessMode: o.guessMode === 'same-map' ? 'same-map' : 'turns',
    scoring: room.scoring,
  };
}

function defaults(): LocalSetup {
  return {
    players: [{ id: 'p1', nick: playerName(getNick(), 0), avatar: getAvatar() }],
    settings: { mapId: '', ...DEFAULT_LOCAL_SETTINGS },
  };
}

/** Última lista de jogadores e regras do modo "Neste PC". Valor corrompido vira o padrão. */
export function loadLocalSetup(): LocalSetup {
  const raw = safeStorage.get(KEY);
  if (!raw) return defaults();
  try {
    const o = JSON.parse(raw) as { players?: unknown; settings?: unknown };
    const list = Array.isArray(o.players) ? o.players.slice(0, MAX_LOCAL_PLAYERS) : [];
    if (list.length === 0) return defaults();
    const players = list.map((p, i) => {
      const r = (p && typeof p === 'object' ? p : {}) as Record<string, unknown>;
      return { id: typeof r.id === 'string' && r.id ? r.id : `p${i + 1}`, nick: playerName(r.nick, i), avatar: sanitizeAvatar(r.avatar) };
    });
    return { players, settings: sanitizeSettingsLocal(o.settings) };
  } catch {
    return defaults();
  }
}

export function saveLocalSetup(s: LocalSetup): void {
  safeStorage.set(KEY, JSON.stringify(s));
}
