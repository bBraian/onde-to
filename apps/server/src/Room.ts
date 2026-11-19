import {
  createDeck,
  DEFAULT_SETTINGS,
  duelMultiplier,
  resolveDuelRound,
  sanitizeSettings,
  scoreGuess,
  type GameMap,
  type GuessResult,
  type LatLng,
  type MapPoint,
  type Phase,
  type RoomSettings,
  type RoomView,
  type RoundResultView,
  type TeamId,
} from '@onde-to/shared';

export interface RoomDeps {
  loadMap(id: string): GameMap;
  allowedMapIds: string[];
  rng: () => number;
  onChange(room: Room): void;
}

export const MAX_PLAYERS = 8;
export const HOST_GRACE_MS = 30_000;
export const LOBBY_DROP_MS = 60_000;

interface Player {
  id: string;
  session: string;
  nick: string;
  team: TeamId | null;
  connected: boolean;
  spectator: boolean;
  total: number;
}

const isValidLatLng = (p: LatLng | undefined | null): p is LatLng =>
  !!p &&
  typeof p.lat === 'number' &&
  typeof p.lng === 'number' &&
  Number.isFinite(p.lat) &&
  Number.isFinite(p.lng) &&
  p.lat >= -90 &&
  p.lat <= 90 &&
  p.lng >= -180 &&
  p.lng <= 180;

export class Room {
  readonly code: string;
  lastActivity = Date.now();

  private players: Player[] = [];
  private hostId: string | null = null;
  private settings: RoomSettings = { ...DEFAULT_SETTINGS };
  private phase: Phase = 'lobby';
  private map: GameMap | null = null;
  private deck: ReturnType<typeof createDeck> | null = null;
  private roundNumber = 0;
  private point: MapPoint | null = null;
  private deadline: number | null = null;
  private guesses = new Map<string, LatLng>();
  private result: RoundResultView | null = null;
  private history: RoundResultView[] = [];
  private nextAt: number | null = null;
  private winner: RoomView['winner'] = null;
  private roundTimer: ReturnType<typeof setTimeout> | null = null;
  private nextTimer: ReturnType<typeof setTimeout> | null = null;
  private hostTimer: ReturnType<typeof setTimeout> | null = null;
  /** Desde quando o host está offline (null = online). Passada a carência, quem estiver conectado assume. */
  private hostOfflineSince: number | null = null;
  private dropTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private duelHp: Record<TeamId, number> | null = null;
  private seq = 0;

  constructor(code: string, private readonly deps: RoomDeps) {
    this.code = code;
    if (!deps.allowedMapIds.includes(this.settings.mapId) && deps.allowedMapIds.length) {
      this.settings.mapId = deps.allowedMapIds[0];
    }
  }

  // ── jogadores ────────────────────────────────────────────────────────────

  addPlayer(session: string, nick: string): { playerId: string } | { error: 'full' } {
    const existing = this.players.find((p) => p.session === session);
    if (existing) {
      existing.connected = true;
      this.cancelPresenceTimers(existing.id);
      this.ensureHost();
      this.changed();
      return { playerId: existing.id };
    }
    if (this.players.length >= MAX_PLAYERS) return { error: 'full' };
    const player: Player = {
      id: `p${++this.seq}`,
      session,
      nick,
      team: this.smallerTeam(),
      connected: true,
      spectator: this.phase !== 'lobby',
      total: 0,
    };
    this.players.push(player);
    if (!this.hostId) this.hostId = player.id;
    this.changed();
    return { playerId: player.id };
  }

  hasSession(session: string): boolean {
    return this.players.some((p) => p.session === session);
  }

  setConnected(playerId: string, connected: boolean): void {
    const p = this.player(playerId);
    if (!p || p.connected === connected) return;
    p.connected = connected;
    if (connected) {
      this.cancelPresenceTimers(playerId);
      this.ensureHost();
    } else {
      if (this.isHost(playerId)) {
        this.hostOfflineSince = Date.now();
        this.hostTimer = setTimeout(() => this.ensureHost(true), HOST_GRACE_MS);
      }
      if (this.phase === 'lobby') this.armLobbyDrop(playerId);
    }
    if (this.phase === 'round' && this.allGuessed()) return this.finishRound();
    this.changed();
  }

  removePlayer(playerId: string): void {
    const idx = this.players.findIndex((p) => p.id === playerId);
    if (idx < 0) return;
    this.players.splice(idx, 1);
    this.cancelPresenceTimers(playerId);
    if (this.hostId === playerId) {
      this.hostId = this.nextHost(playerId);
      // Novo host desconectado: o primeiro que voltar assume, sem esperar carência.
      this.hostOfflineSince = this.host()?.connected === false ? -Infinity : null;
    }
    if (this.phase === 'round' && this.allGuessed()) return this.finishRound();
    this.changed();
  }

  connectedCount(): number {
    return this.players.filter((p) => p.connected).length;
  }

  // ── lobby ────────────────────────────────────────────────────────────────

  updateSettings(byId: string, p: Partial<RoomSettings>): void {
    if (!this.isHost(byId) || this.phase !== 'lobby') return;
    this.settings = sanitizeSettings(p, this.settings, this.deps.allowedMapIds);
    this.changed();
  }

  setTeam(byId: string, targetId: string, team: TeamId): void {
    if (this.phase !== 'lobby' || (team !== 'A' && team !== 'B')) return;
    if (!this.isHost(byId) && byId !== targetId) return;
    const target = this.player(targetId);
    if (!target) return;
    target.team = team;
    this.changed();
  }

  start(byId: string): void {
    if (!this.isHost(byId) || this.phase !== 'lobby') return;
    const duel = this.settings.mode === 'duel';
    const present = (t: TeamId) => this.activePlayers().some((p) => p.team === t && p.connected);
    if (duel && !(['A', 'B'] as TeamId[]).every(present)) return;
    this.map = this.deps.loadMap(this.settings.mapId);
    this.duelHp = duel ? { A: this.settings.duelStartHp, B: this.settings.duelStartHp } : null;
    this.deck = createDeck(this.map.pontos, this.deps.rng);
    for (const p of this.players) p.total = 0;
    this.history = [];
    this.winner = null;
    this.startRound(1);
  }

  backToLobby(byId: string): void {
    if (!this.isHost(byId) || this.phase === 'lobby') return;
    this.clearTimers();
    for (const p of this.players) {
      p.total = 0;
      p.spectator = false;
    }
    this.phase = 'lobby';
    // Quem caiu durante a partida e não voltou sai do lobby depois do prazo normal.
    for (const p of this.players) if (!p.connected) this.armLobbyDrop(p.id);
    this.roundNumber = 0;
    this.point = null;
    this.deadline = null;
    this.guesses.clear();
    this.result = null;
    this.history = [];
    this.nextAt = null;
    this.winner = null;
    this.duelHp = null;
    this.changed();
  }

  // ── rodada ───────────────────────────────────────────────────────────────

  guess(playerId: string, p: LatLng): void {
    const player = this.player(playerId);
    if (this.phase !== 'round' || !player || player.spectator || this.guesses.has(playerId)) return;
    if (!isValidLatLng(p)) return;
    this.guesses.set(playerId, { lat: p.lat, lng: p.lng });
    if (this.allGuessed()) return this.finishRound();
    if (this.settings.mode === 'duel' && this.guesses.size === 1) this.startGuessCountdown();
    this.changed();
  }

  endRound(byId: string): void {
    if (!this.isHost(byId) || this.phase !== 'round') return;
    this.finishRound();
  }

  reroll(byId: string): void {
    if (!this.isHost(byId) || this.phase !== 'round' || !this.deck) return;
    const point = this.deck.draw();
    if (!point) return;
    this.point = point;
    this.guesses.clear();
    this.armRoundTimer();
    this.changed();
  }

  next(byId: string): void {
    if (!this.isHost(byId) || this.phase !== 'result') return;
    this.advance();
  }

  // ── estado ───────────────────────────────────────────────────────────────

  view(): RoomView {
    return {
      code: this.code,
      phase: this.phase,
      settings: { ...this.settings },
      players: this.players.map((p) => ({
        id: p.id,
        nick: p.nick,
        team: p.team,
        isHost: p.id === this.hostId,
        connected: p.connected,
        spectator: p.spectator,
        hasGuessed: this.phase === 'round' && this.guesses.has(p.id),
        total: p.total,
      })),
      round:
        this.point && (this.phase === 'round' || this.phase === 'result')
          ? { number: this.roundNumber, imageId: this.point.imageId, deadline: this.phase === 'round' ? this.deadline : null }
          : null,
      result: this.phase === 'result' || this.phase === 'finished' ? this.result : null,
      history: this.history,
      duelHp: this.phase === 'lobby' ? null : this.duelHp,
      nextAt: this.phase === 'result' ? this.nextAt : null,
      winner: this.winner,
      serverNow: Date.now(),
    };
  }

  // ── internos ─────────────────────────────────────────────────────────────

  private player(id: string) {
    return this.players.find((p) => p.id === id);
  }

  private isHost(id: string) {
    return id === this.hostId;
  }

  private activePlayers() {
    return this.players.filter((p) => !p.spectator);
  }

  private allGuessed(): boolean {
    const connected = this.activePlayers().filter((p) => p.connected);
    return connected.length > 0 && connected.every((p) => this.guesses.has(p.id));
  }

  private startRound(n: number): void {
    const point = this.deck?.draw() ?? null;
    if (!point) return this.finishGame();
    this.clearTimers();
    this.roundNumber = n;
    this.point = point;
    this.guesses.clear();
    this.result = null;
    this.nextAt = null;
    this.phase = 'round';
    this.armRoundTimer();
    this.changed();
  }

  private armRoundTimer(): void {
    if (this.roundTimer) clearTimeout(this.roundTimer);
    this.roundTimer = null;
    const sec = this.settings.roundTimeSec;
    this.deadline = sec ? Date.now() + sec * 1000 : null;
    if (this.deadline) this.roundTimer = setTimeout(() => this.finishRound(), this.deadline - Date.now());
  }

  private finishRound(): void {
    if (this.phase !== 'round' || !this.point || !this.map) return;
    this.clearTimers();
    const guesses: GuessResult[] = this.activePlayers().map((p) => {
      const g = this.guesses.get(p.id) ?? null;
      const { distanceKm, score } = scoreGuess(g, this.point!, this.map!.tamanhoKm);
      p.total += score;
      return { playerId: p.id, guess: g, distanceKm, score };
    });
    let duel: RoundResultView['duel'] = null;
    if (this.settings.mode === 'duel' && this.duelHp) {
      const best = (t: TeamId) =>
        Math.max(0, ...guesses.filter((g) => this.player(g.playerId)?.team === t).map((g) => g.score));
      const s = this.settings;
      duel = resolveDuelRound({ A: best('A'), B: best('B') }, this.duelHp, duelMultiplier(this.roundNumber, s.duelMultiplierStartRound, s.duelMultiplierStep));
      this.duelHp = duel.hp;
    }
    this.result = { round: this.roundNumber, answer: this.point, guesses, duel };
    this.history.push(this.result);
    this.phase = 'result';
    this.deadline = null;
    const auto = this.settings.autoAdvanceSec;
    this.nextAt = auto ? Date.now() + auto * 1000 : null;
    if (this.nextAt) this.nextTimer = setTimeout(() => this.advance(), this.nextAt - Date.now());
    this.changed();
  }

  private advance(): void {
    if (this.phase !== 'result') return;
    if (this.duelHp) {
      if (this.duelHp.A <= 0 || this.duelHp.B <= 0) return this.finishGame();
    } else if (this.roundNumber >= this.settings.rounds) return this.finishGame();
    this.startRound(this.roundNumber + 1);
  }

  private finishGame(): void {
    this.clearTimers();
    if (this.duelHp) {
      const { A, B } = this.duelHp;
      this.winner = A === B ? null : { team: A > B ? 'A' : 'B' };
    } else {
      const active = this.activePlayers();
      const best = Math.max(0, ...active.map((p) => p.total));
      this.winner = { playerIds: active.filter((p) => p.total === best).map((p) => p.id) };
    }
    this.phase = 'finished';
    this.nextAt = null;
    this.deadline = null;
    this.changed();
  }

  /** Duelo: o primeiro palpite encurta o prazo para duelGuessCountdownSec, se faltar mais que isso. */
  private startGuessCountdown(): void {
    const ms = this.settings.duelGuessCountdownSec * 1000;
    const shortened = Date.now() + ms;
    if (this.deadline !== null && this.deadline <= shortened) return;
    this.deadline = shortened;
    if (this.roundTimer) clearTimeout(this.roundTimer);
    this.roundTimer = setTimeout(() => this.finishRound(), ms);
  }

  private smallerTeam(): TeamId {
    const count = (t: TeamId) => this.players.filter((p) => p.team === t).length;
    return count('B') < count('A') ? 'B' : 'A';
  }

  private nextHost(excludeId: string): string | null {
    const others = this.players.filter((p) => p.id !== excludeId);
    return (others.find((p) => p.connected) ?? others[0])?.id ?? null;
  }

  private host(): Player | undefined {
    return this.hostId ? this.player(this.hostId) : undefined;
  }

  /** Passa o host para o conectado mais antigo se o atual está offline além da carência (ou se `force`, ao fim dela). */
  private ensureHost(force = false): void {
    if (force) this.hostTimer = null;
    const h = this.host();
    if (h?.connected) {
      this.hostOfflineSince = null;
      return;
    }
    const expired = force || (this.hostOfflineSince !== null && Date.now() - this.hostOfflineSince >= HOST_GRACE_MS);
    if (h && !expired) return;
    const next = this.players.find((x) => x.connected);
    if (!next) return;
    this.hostId = next.id;
    this.hostOfflineSince = null;
    this.changed();
  }

  private armLobbyDrop(playerId: string): void {
    const prev = this.dropTimers.get(playerId);
    if (prev) clearTimeout(prev);
    this.dropTimers.set(playerId, setTimeout(() => this.dropIfGone(playerId), LOBBY_DROP_MS));
  }

  private dropIfGone(playerId: string): void {
    this.dropTimers.delete(playerId);
    const p = this.player(playerId);
    if (p && !p.connected && this.phase === 'lobby') this.removePlayer(playerId);
  }

  private cancelPresenceTimers(playerId: string): void {
    const t = this.dropTimers.get(playerId);
    if (t) clearTimeout(t);
    this.dropTimers.delete(playerId);
    if (this.isHost(playerId) && this.hostTimer) {
      clearTimeout(this.hostTimer);
      this.hostTimer = null;
    }
  }

  dispose(): void {
    this.clearTimers();
    if (this.hostTimer) clearTimeout(this.hostTimer);
    for (const t of this.dropTimers.values()) clearTimeout(t);
    this.dropTimers.clear();
    this.hostTimer = null;
  }

  private clearTimers(): void {
    if (this.roundTimer) clearTimeout(this.roundTimer);
    if (this.nextTimer) clearTimeout(this.nextTimer);
    this.roundTimer = null;
    this.nextTimer = null;
  }

  private changed(): void {
    this.lastActivity = Date.now();
    this.deps.onChange(this);
  }
}
