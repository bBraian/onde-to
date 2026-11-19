import { useState } from 'react';
import { randomAvatar, type Movement, type Scoring } from '@onde-to/shared';
import { Logo } from '../../components/Logo';
import { PinAvatar } from '../../avatar/PinAvatar';
import { AvatarEditorPanel } from '../AvatarEditor';
import { MAX_LOCAL_PLAYERS, type LocalSetup } from '../../lib/localSetup';
import type { GuessMode, LocalPlayer, LocalSettings } from '../../game/local';

const MOVEMENTS: { id: Movement; label: string }[] = [
  { id: 'move', label: 'Pode andar' },
  { id: 'no-move', label: 'Sem andar' },
  { id: 'nmpz', label: 'Visão fixa' },
];

interface Props {
  maps: { id: string; nome: string }[];
  setup: LocalSetup;
  onChange: (s: LocalSetup) => void;
  onStart: () => void;
  loading: boolean;
  error: string | null;
}

export function Setup({ maps, setup, onChange, onStart, loading, error }: Props) {
  const [editing, setEditing] = useState<number | null>(null);
  const { players, settings: s } = setup;
  const multi = players.length > 1;
  const setPlayers = (list: LocalPlayer[]) => onChange({ ...setup, players: list });
  const set = (patch: Partial<LocalSettings>) => onChange({ ...setup, settings: { ...s, ...patch } });
  const updatePlayer = (i: number, patch: Partial<LocalPlayer>) => setPlayers(players.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  const addPlayer = () => {
    if (players.length >= MAX_LOCAL_PLAYERS) return;
    const avatar = randomAvatar(Math.random, players.map((p) => p.avatar.color));
    setPlayers([...players, { id: `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, nick: `Jogador ${players.length + 1}`, avatar }]);
  };

  const edited = editing !== null ? players[editing] : null;

  return (
    <div className="page">
      <header className="topbar">
        <Logo />
      </header>
      <main className="local-setup">
        <section className="card">
          <div>
            <h1 className="page-title">Neste PC</h1>
            <p>Sozinho pra treinar ou com a galera revezando no mesmo computador. Cada um com seu alfinete.</p>
          </div>
          <ul className="setup-players">
            {players.map((p, i) => (
              <li key={p.id} className="setup-player pop">
                <button type="button" className="link-btn" aria-label={`Editar o alfinete de ${p.nick}`} onClick={() => setEditing(i)}>
                  <PinAvatar avatar={p.avatar} size={44} title="" />
                </button>
                <input
                  className="input"
                  aria-label={`Apelido do jogador ${i + 1}`}
                  maxLength={20}
                  value={p.nick}
                  onChange={(e) => updatePlayer(i, { nick: e.target.value })}
                />
                <button type="button" className="btn btn-sm" onClick={() => setEditing(i)}>
                  Editar
                </button>
                {multi && (
                  <button type="button" className="btn btn-sm" aria-label={`Remover ${p.nick}`} onClick={() => setPlayers(players.filter((_, j) => j !== i))}>
                    ✕
                  </button>
                )}
              </li>
            ))}
          </ul>
          <button type="button" className="btn btn-yellow self-start" disabled={players.length >= MAX_LOCAL_PLAYERS} onClick={addPlayer}>
            Adicionar jogador
          </button>
        </section>

        <form
          className="card settings-card"
          onSubmit={(e) => {
            e.preventDefault();
            onStart();
          }}
        >
          <h2>Regras</h2>
          {maps.length === 0 ? (
            <p>Nenhum mapa disponível ainda. Gere os mapas com o script build-maps.</p>
          ) : (
            <>
              <div className="field">
                <label htmlFor="l-mapa">Mapa</label>
                <select id="l-mapa" className="select" value={s.mapId} onChange={(e) => set({ mapId: e.target.value })}>
                  {maps.map((m) => (
                    <option key={m.id} value={m.id}>{m.nome}</option>
                  ))}
                </select>
              </div>
              <div className="settings-grid">
                <div className="field">
                  <label htmlFor="l-rodadas">Rodadas</label>
                  <select id="l-rodadas" className="select" value={s.rounds} onChange={(e) => set({ rounds: Number(e.target.value) })}>
                    {[1, 3, 5, 10, 15, 20].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="l-tempo">{multi && s.guessMode === 'turns' ? 'Tempo por vez' : 'Tempo por rodada'}</label>
                  <select id="l-tempo" className="select" value={s.timeSec ?? 0} onChange={(e) => set({ timeSec: Number(e.target.value) || null })}>
                    <option value={0}>Sem limite</option>
                    {[30, 60, 120, 300].map((n) => (
                      <option key={n} value={n}>{n < 60 ? `${n} s` : `${n / 60} min`}</option>
                    ))}
                  </select>
                </div>
              </div>
              <fieldset className="field">
                <legend>Movimento</legend>
                <div className="segmented">
                  {MOVEMENTS.map((m) => (
                    <button key={m.id} type="button" aria-pressed={s.movement === m.id} onClick={() => set({ movement: m.id })}>
                      {m.label}
                    </button>
                  ))}
                </div>
              </fieldset>
              {multi && (
                <fieldset className="field">
                  <legend>Como cada um marca</legend>
                  <div className="segmented">
                    {(['turns', 'same-map'] as GuessMode[]).map((g) => (
                      <button key={g} type="button" aria-pressed={s.guessMode === g} onClick={() => set({ guessMode: g })}>
                        {g === 'turns' ? 'Turnos' : 'Mesmo mapa'}
                      </button>
                    ))}
                  </div>
                  <p className="small muted">
                    {s.guessMode === 'turns' ? 'Cada um na sua vez, sem ver o palpite dos outros.' : 'Todo mundo marca no mesmo mapa, escolhendo de quem é o pino.'}
                  </p>
                </fieldset>
              )}
              <fieldset className="field">
                <legend>Pontuação</legend>
                <div className="segmented">
                  {(['distance', 'rounds'] as Scoring[]).map((k) => (
                    <button key={k} type="button" aria-pressed={s.scoring === k} onClick={() => set({ scoring: k })}>
                      {k === 'distance' ? 'Distância' : 'Rodada (1 ponto pro mais perto)'}
                    </button>
                  ))}
                </div>
              </fieldset>
              {error && <p role="alert" className="error">{error}</p>}
              <button type="submit" className="btn btn-primary btn-lg pulse-ring" disabled={loading || !s.mapId}>
                {loading ? 'Carregando…' : 'Começar!'}
              </button>
            </>
          )}
        </form>
      </main>

      {edited && editing !== null && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={`Alfinete de ${edited.nick}`}
          onKeyDown={(e) => e.key === 'Escape' && setEditing(null)}
        >
          <div className="modal pop">
            <AvatarEditorPanel
              value={edited.avatar}
              nick={edited.nick}
              takenColors={players.filter((_, j) => j !== editing).map((p) => p.avatar.color)}
              onChange={(avatar, nick) => updatePlayer(editing, { avatar, nick })}
            />
            <div className="editor-actions">
              <button type="button" className="btn btn-primary btn-lg" autoFocus onClick={() => setEditing(null)}>
                Pronto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
