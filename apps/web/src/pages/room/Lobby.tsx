import { useState } from 'react';
import type { GameMode, Movement, PlayerView, RoomSettings, RoomView, TeamId } from '@onde-to/shared';
import { Logo } from '../../components/Logo';
import { availableMaps } from '../../game/loadMap';
import type { Send } from '../../lib/socket';
import { Avatar } from './Avatar';
import { canStart, isDuel, playerColor, TEAM_NAME } from './helpers';

interface Props {
  view: RoomView;
  me: string;
  send: Send;
  onLeave: () => void;
}

const MOVEMENTS: { id: Movement; label: string }[] = [
  { id: 'move', label: 'Pode andar' },
  { id: 'no-move', label: 'Sem andar' },
  { id: 'nmpz', label: 'Visão fixa' },
];

export function Lobby({ view, me, send, onLeave }: Props) {
  const host = view.players.find((p) => p.isHost);
  const iAmHost = host?.id === me;
  const duel = isDuel(view);
  const [copied, setCopied] = useState(false);
  const s = view.settings;
  const set = (patch: Partial<RoomSettings>) => send('room:settings', patch);

  const copy = async () => {
    const url = `${window.location.origin}/sala/${view.code}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copie o link da sala:', url);
    }
  };

  const row = (p: PlayerView) => (
    <li key={p.id} className="player-row" data-team={duel ? p.team ?? undefined : undefined}>
      <Avatar nick={p.nick} color={playerColor(view, p.id)} dimmed={!p.connected} />
      <span className="player-name">
        {p.nick} {p.id === me && <span className="muted">(você)</span>}
      </span>
      {p.isHost && (
        <svg role="img" aria-label="Dono da sala" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9A6A00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" />
        </svg>
      )}
      {!p.connected && <span className="tag">reconectando…</span>}
      {duel && iAmHost && p.id !== me && (
        <button type="button" className="link-btn" onClick={() => send('room:team', { playerId: p.id, team: p.team === 'A' ? 'B' : 'A' })}>
          trocar
        </button>
      )}
    </li>
  );

  const team = (t: TeamId) => {
    const members = view.players.filter((p) => p.team === t);
    const mine = view.players.find((p) => p.id === me)?.team;
    return (
      <div key={t} className={`team-card team-${t}`}>
        <div className="team-head">
          <h2>{TEAM_NAME[t]}</h2>
          <span className="muted small">{members.length} {members.length === 1 ? 'jogador' : 'jogadores'}</span>
        </div>
        <ul className="player-list">{members.map(row)}</ul>
        {mine !== t && (
          <button type="button" className={`btn btn-team btn-team-${t}`} onClick={() => send('room:team', { playerId: me, team: t })}>
            Ir para o {TEAM_NAME[t]}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="page">
      <header className="topbar topbar-line">
        <Logo size={22} />
        <div className="room-code">
          <span className="muted small">Código da sala</span>
          <strong data-testid="room-code">{view.code}</strong>
          <button type="button" className="btn btn-outline btn-sm" onClick={copy}>
            {copied ? 'Link copiado!' : 'Copiar link'}
          </button>
        </div>
      </header>

      <main className="lobby">
        <section className="lobby-players">
          <div className="lobby-head">
            <h1>Quem está na sala</h1>
            <span className="muted small">{view.players.length} de 8 jogadores</span>
          </div>
          {duel ? (
            <>
              <div className="teams">{(['A', 'B'] as TeamId[]).map(team)}</div>
              <p className="muted small">No Duelo conta o melhor palpite de cada time. Quem fizer menos pontos perde vida.</p>
            </>
          ) : (
            <ul className="player-list card-list">{view.players.map(row)}</ul>
          )}
          <button type="button" className="link-btn self-start" onClick={onLeave}>Sair da sala</button>
        </section>

        <aside className="card lobby-settings">
          <h2>Configurações</h2>
          {!iAmHost && <p className="muted small">Só {host?.nick ?? 'o dono da sala'} muda as configurações.</p>}
          <fieldset disabled={!iAmHost} className="settings-fieldset">
            <div className="field">
              <label htmlFor="s-mapa">Mapa</label>
              <select id="s-mapa" className="select" value={s.mapId} onChange={(e) => set({ mapId: e.target.value })}>
                {availableMaps().map((m) => (
                  <option key={m.id} value={m.id}>{m.nome}</option>
                ))}
              </select>
            </div>
            <fieldset className="field">
              <legend>Modo</legend>
              <div className="segmented">
                {(['classic', 'duel'] as GameMode[]).map((m) => (
                  <button key={m} type="button" aria-pressed={s.mode === m} onClick={() => set({ mode: m })}>
                    {m === 'classic' ? 'Clássico' : 'Duelo'}
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="settings-grid">
              {!duel && (
                <NumberSelect id="s-rodadas" label="Rodadas" value={s.rounds} options={[1, 3, 5, 10, 15, 20]} format={(n) => String(n)} onChange={(rounds) => set({ rounds })} />
              )}
              <NumberSelect
                id="s-tempo" label="Tempo por rodada" value={s.roundTimeSec ?? 0} options={[0, 30, 60, 120, 180, 300]}
                format={(n) => (n === 0 ? 'Sem limite' : n < 60 ? `${n} s` : `${n / 60} min`)}
                onChange={(n) => set({ roundTimeSec: n || null })}
              />
              <div className="field">
                <label htmlFor="s-mov">Movimento</label>
                <select id="s-mov" className="select" value={s.movement} onChange={(e) => set({ movement: e.target.value as Movement })}>
                  {MOVEMENTS.map((m) => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
              </div>
              {duel && (
                <>
                  <NumberSelect id="s-vida" label="Vida inicial" value={s.duelStartHp} options={[1000, 3000, 6000, 10000, 20000]} format={(n) => n.toLocaleString('pt-BR')} onChange={(duelStartHp) => set({ duelStartHp })} />
                  <NumberSelect id="s-apos" label="Após o 1º chute" value={s.duelGuessCountdownSec} options={[5, 10, 15, 30, 60]} format={(n) => `${n} s`} onChange={(duelGuessCountdownSec) => set({ duelGuessCountdownSec })} />
                  <NumberSelect id="s-mult-ini" label="Dano sobe a partir da" value={s.duelMultiplierStartRound} options={[2, 3, 4, 5, 6, 8, 10]} format={(n) => `${n}ª rodada`} onChange={(duelMultiplierStartRound) => set({ duelMultiplierStartRound })} />
                  <NumberSelect id="s-mult-passo" label="Aumento por rodada" value={s.duelMultiplierStep} options={[0.25, 0.5, 1]} format={(n) => `+${String(n).replace('.', ',')}×`} onChange={(duelMultiplierStep) => set({ duelMultiplierStep })} />
                </>
              )}
              <NumberSelect
                id="s-auto" label="Próxima rodada sozinha" value={s.autoAdvanceSec ?? 0} options={[0, 15, 30, 60]}
                format={(n) => (n === 0 ? 'Desligado' : `Em ${n} s`)}
                onChange={(n) => set({ autoAdvanceSec: n || null })}
              />
            </div>
          </fieldset>
          {iAmHost ? (
            <button type="button" className="btn btn-primary btn-lg push-down" disabled={!canStart(view)} onClick={() => send('room:start')}>
              Iniciar partida
            </button>
          ) : (
            <p className="muted push-down center-text">Esperando {host?.nick ?? 'o dono da sala'} iniciar…</p>
          )}
          {iAmHost && duel && !canStart(view) && <p className="muted small center-text">Precisa de pelo menos uma pessoa em cada time.</p>}
        </aside>
      </main>
    </div>
  );
}

function NumberSelect(props: { id: string; label: string; value: number; options: number[]; format: (n: number) => string; onChange: (n: number) => void }) {
  const opts = props.options.includes(props.value) ? props.options : [...props.options, props.value].sort((a, b) => a - b);
  return (
    <div className="field">
      <label htmlFor={props.id}>{props.label}</label>
      <select id={props.id} className="select" value={props.value} onChange={(e) => props.onChange(Number(e.target.value))}>
        {opts.map((n) => (
          <option key={n} value={n}>{props.format(n)}</option>
        ))}
      </select>
    </div>
  );
}
