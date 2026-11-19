import { useState } from 'react';
import { DEFAULT_AVATAR, type Avatar, type GameMode, type Movement, type PlayerView, type RoomSettings, type RoomView, type Scoring, type TeamId } from '@onde-to/shared';
import { Logo } from '../../components/Logo';
import { PinAvatar } from '../../avatar/PinAvatar';
import { setAvatar } from '../../avatar/storage';
import { setNick } from '../../lib/session';
import { AvatarEditorPanel, cleanNick } from '../AvatarEditor';
import { availableMaps } from '../../game/loadMap';
import type { Send } from '../../lib/socket';
import { canStart, isDuel, TEAM_NAME } from './helpers';

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
  const self = view.players.find((p) => p.id === me);
  // Edição do alfinete num modal: sair da página derrubaria a conexão (o host perde o papel em 30 s).
  const [editing, setEditing] = useState<{ avatar: Avatar; nick: string } | null>(null);
  const saveEdit = () => {
    if (!editing) return;
    const nick = cleanNick(editing.nick);
    if (!nick) return;
    setAvatar(editing.avatar);
    setNick(nick);
    send('room:avatar', editing.avatar);
    if (nick !== self?.nick) send('room:nick', nick);
    setEditing(null);
  };
  const closeOnEscape = (ev: React.KeyboardEvent) => {
    if (ev.key === 'Escape') setEditing(null);
  };
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

  const card = (p: PlayerView, i: number) => (
    <li key={p.id} className="player-row pop" data-team={duel ? (p.team ?? undefined) : undefined} data-offline={p.connected ? undefined : ''}>
      <div className={p.connected ? 'bob' : undefined} style={{ animationDelay: `${-i * 0.45}s` }}>
        <PinAvatar avatar={p.avatar} size={60} title={`Alfinete de ${p.nick}`} />
      </div>
      <span className="player-name">{p.nick}</span>
      {(p.isHost || p.id === me) && <span className="badge">{[p.isHost && 'dono', p.id === me && 'você'].filter(Boolean).join(' · ')}</span>}
      {!p.connected && <span className="tag">reconectando…</span>}
      {duel && iAmHost && p.id !== me && (
        <button type="button" className="link-btn" onClick={() => send('room:team', { playerId: p.id, team: p.team === 'A' ? 'B' : 'A' })}>
          trocar time
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
          <span className="small muted">{members.length} {members.length === 1 ? 'jogador' : 'jogadores'}</span>
        </div>
        <ul className="player-list">{members.map((p) => card(p, view.players.indexOf(p)))}</ul>
        {mine !== t && (
          <button type="button" className={`btn btn-team btn-team-${t}`} onClick={() => send('room:team', { playerId: me, team: t })}>
            Ir pro {TEAM_NAME[t]}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="page">
      <header className="topbar">
        <Logo />
        <div className="room-code">
          <div className="code-sticker">
            <span>SALA</span>
            <strong data-testid="room-code">{view.code}</strong>
          </div>
          <button type="button" className="btn btn-sm" onClick={copy}>
            {copied ? 'Link copiado!' : 'Copiar link'}
          </button>
        </div>
      </header>

      <main className="lobby">
        <section className="lobby-players">
          <div className="lobby-head">
            <h1>Quem tá na sala <span className="small muted">{view.players.length} de 8</span></h1>
            <button type="button" className="btn btn-sm btn-yellow" onClick={() => setEditing({ avatar: self?.avatar ?? DEFAULT_AVATAR, nick: self?.nick ?? '' })}>
              Editar meu alfinete
            </button>
          </div>
          {duel ? (
            <>
              <div className="teams">{(['A', 'B'] as TeamId[]).map(team)}</div>
              <p className="muted">No Duelo vale o melhor palpite de cada time. Quem fizer menos pontos perde vida!</p>
            </>
          ) : (
            <ul className="player-list card-list">{view.players.map(card)}</ul>
          )}
          <button type="button" className="link-btn self-start" onClick={onLeave}>Sair da sala</button>
        </section>

        <aside className="card lobby-settings">
          <h2>Regras</h2>
          {!iAmHost && <p className="small">Só {host?.nick ?? 'o dono da sala'} muda as regras.</p>}
          <fieldset disabled={!iAmHost} className="settings-fieldset">
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
            <div className="field">
              <label htmlFor="s-mapa">Mapa</label>
              <select id="s-mapa" className="select" value={s.mapId} onChange={(e) => set({ mapId: e.target.value })}>
                {availableMaps().map((m) => (
                  <option key={m.id} value={m.id}>{m.nome}</option>
                ))}
              </select>
            </div>
            {!duel && (
              <fieldset className="field">
                <legend>Pontuação</legend>
                <div className="segmented">
                  {(['distance', 'rounds'] as Scoring[]).map((k) => (
                    <button key={k} type="button" aria-pressed={s.scoring === k} onClick={() => set({ scoring: k })}>
                      {k === 'distance' ? 'Distância' : 'Rodada (+1 pro mais perto)'}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}
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
                  <NumberSelect id="s-mult-passo" label="Aumento por rodada" value={s.duelMultiplierStep} options={[0.2, 0.5, 1]} format={(n) => `+${String(n).replace('.', ',')}×`} onChange={(duelMultiplierStep) => set({ duelMultiplierStep })} />
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
            <button type="button" className="btn btn-primary btn-lg push-down pulse-ring" disabled={!canStart(view)} onClick={() => send('room:start')}>
              Iniciar partida
            </button>
          ) : (
            <p className="push-down center-text">Esperando {host?.nick ?? 'o dono da sala'} iniciar…</p>
          )}
          {iAmHost && duel && !canStart(view) && <p className="small center-text">Precisa de pelo menos uma pessoa conectada em cada time.</p>}
        </aside>
      </main>

      {editing && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Editar meu alfinete" onKeyDown={closeOnEscape}>
          <div className="modal pop">
            <AvatarEditorPanel value={editing.avatar} nick={editing.nick} onChange={(avatar, nick) => setEditing({ avatar, nick })} />
            <div className="editor-actions">
              <button type="button" className="btn btn-outline btn-lg" onClick={() => setEditing(null)}>
                Cancelar
              </button>
              <button type="button" className="btn btn-primary btn-lg" disabled={!cleanNick(editing.nick)} onClick={saveEdit}>
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
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
