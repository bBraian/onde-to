import type { JoinAck } from '@onde-to/shared';
import { generateCode, normalizeCode, sanitizeNick } from './codes';
import { Room, type RoomDeps } from './Room';

export const EMPTY_ROOM_TTL_MS = 10 * 60_000;

export class RoomManager {
  private rooms = new Map<string, Room>();

  constructor(private readonly deps: RoomDeps) {}

  create(session: string, nick: string, avatar?: unknown): JoinAck {
    const clean = sanitizeNick(nick, []);
    if (!clean) return { ok: false, error: 'invalid_nick' };
    const code = generateCode(this.deps.rng, new Set(this.rooms.keys()));
    const room = new Room(code, this.deps);
    this.rooms.set(code, room);
    const res = room.addPlayer(session, clean, avatar);
    if ('error' in res) return { ok: false, error: res.error };
    return { ok: true, code, playerId: res.playerId };
  }

  join(rawCode: string, session: string, nick: string, avatar?: unknown): JoinAck {
    const code = normalizeCode(rawCode);
    const room = this.rooms.get(code);
    if (!room) return { ok: false, error: 'not_found' };
    let name = nick;
    if (!room.hasSession(session)) {
      const clean = sanitizeNick(nick, room.view().players.map((p) => p.nick));
      if (!clean) return { ok: false, error: 'invalid_nick' };
      name = clean;
    }
    const res = room.addPlayer(session, name, avatar);
    if ('error' in res) return { ok: false, error: res.error };
    return { ok: true, code, playerId: res.playerId };
  }

  get(code: string): Room | undefined {
    return this.rooms.get(normalizeCode(code));
  }

  sweep(now: number): void {
    for (const [code, room] of this.rooms) {
      if (room.connectedCount() === 0 && now - room.lastActivity >= EMPTY_ROOM_TTL_MS) {
        room.dispose();
        this.rooms.delete(code);
      }
    }
  }
}
