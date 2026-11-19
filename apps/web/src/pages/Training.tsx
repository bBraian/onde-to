import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import type { LatLng, Movement } from '@onde-to/shared';
import { Logo } from '../components/Logo';
import { StreetViewer } from '../components/StreetViewer';
import { GuessMap } from '../components/GuessMap';
import { ResultMap } from '../components/ResultMap';
import { Countdown } from '../components/Countdown';
import { Attribution } from '../components/Attribution';
import { initialView } from '../components/mapStyle';
import { availableMaps, loadMap, mapName } from '../game/loadMap';
import { trainingReducer, type TrainingSettings } from '../game/training';
import { recordKey, saveRecord } from '../lib/records';
import { formatKm, formatPoints } from '../lib/format';

const MOVEMENTS: { id: Movement; label: string }[] = [
  { id: 'move', label: 'Pode andar' },
  { id: 'no-move', label: 'Sem andar' },
  { id: 'nmpz', label: 'Visão fixa' },
];

export function Training() {
  const maps = useMemo(() => availableMaps(), []);
  const [state, dispatch] = useReducer(trainingReducer, { phase: 'setup' });
  const [settings, setSettings] = useState<TrainingSettings>({
    mapId: maps[0]?.id ?? '', rounds: 5, roundTimeSec: null, movement: 'move',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async (s: TrainingSettings) => {
    setLoading(true);
    setError(null);
    try {
      const map = await loadMap(s.mapId);
      dispatch({ type: 'start', settings: s, map, rng: Math.random, now: Date.now() });
    } catch {
      setError('Não consegui carregar esse mapa.');
    } finally {
      setLoading(false);
    }
  };

  if (state.phase === 'setup') {
    return <Setup maps={maps} settings={settings} onChange={setSettings} onStart={() => start(settings)} loading={loading} error={error} />;
  }
  if (state.phase === 'round') {
    return <TrainingRound key={`${state.round}-${state.point.imageId}`} state={state} dispatch={dispatch} />;
  }
  if (state.phase === 'result') {
    const last = state.results[state.results.length - 1];
    const isLast = state.round >= state.settings.rounds || state.queue.length === 0;
    return (
      <div className="result-layout">
        <section className="result-map" aria-label="Mapa do resultado">
          <ResultMap answer={last.answer} guesses={[{ guess: last.guess, label: 'Você', color: 'var(--accent)' }]} />
        </section>
        <aside className="result-side">
          <div>
            <p className="eyebrow">
              Rodada {state.round} de {state.settings.rounds} · {state.map.nome}
            </p>
            <h1 className="result-title">{last.guess ? `${formatPoints(last.score)} pontos` : 'Sem palpite'}</h1>
            <p className="muted">
              {last.distanceKm !== null ? `Você errou por ${formatKm(last.distanceKm)}. ` : 'O tempo acabou antes do chute. '}
              Era em {last.answer.regiao}.
            </p>
            <Attribution autor={last.answer.autor} className="attribution muted" />
          </div>
          <p className="muted">Total até agora: <strong>{formatPoints(state.results.reduce((s, r) => s + r.score, 0))}</strong></p>
          <button type="button" className="btn btn-primary btn-lg btn-block push-down" onClick={() => dispatch({ type: 'next', now: Date.now() })}>
            {isLast ? 'Ver resumo' : 'Próxima rodada'}
          </button>
        </aside>
      </div>
    );
  }
  return <Summary state={state} onAgain={() => start(state.settings)} onSetup={() => dispatch({ type: 'setup' })} />;
}

function Setup(props: {
  maps: { id: string; nome: string }[];
  settings: TrainingSettings;
  onChange: (s: TrainingSettings) => void;
  onStart: () => void;
  loading: boolean;
  error: string | null;
}) {
  const { maps, settings: s, onChange, onStart, loading, error } = props;
  const set = (patch: Partial<TrainingSettings>) => onChange({ ...s, ...patch });
  return (
    <div className="page">
      <header className="topbar">
        <Logo size={22} />
      </header>
      <main className="narrow">
        <h1 className="page-title">Treino</h1>
        {maps.length === 0 ? (
          <p className="muted">Nenhum mapa disponível ainda. Gere os mapas com o script build-maps.</p>
        ) : (
          <form
            className="card settings-card"
            onSubmit={(e) => {
              e.preventDefault();
              onStart();
            }}
          >
            <div className="field">
              <label htmlFor="t-mapa">Mapa</label>
              <select id="t-mapa" className="select" value={s.mapId} onChange={(e) => set({ mapId: e.target.value })}>
                {maps.map((m) => (
                  <option key={m.id} value={m.id}>{m.nome}</option>
                ))}
              </select>
            </div>
            <div className="settings-grid">
              <div className="field">
                <label htmlFor="t-rodadas">Rodadas</label>
                <select id="t-rodadas" className="select" value={s.rounds} onChange={(e) => set({ rounds: Number(e.target.value) })}>
                  {[3, 5, 10, 15, 20].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="t-tempo">Tempo por rodada</label>
                <select
                  id="t-tempo"
                  className="select"
                  value={s.roundTimeSec ?? 0}
                  onChange={(e) => set({ roundTimeSec: Number(e.target.value) || null })}
                >
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
            {error && <p role="alert" className="error">{error}</p>}
            <button type="submit" className="btn btn-primary btn-lg" disabled={loading || !s.mapId}>
              {loading ? 'Carregando…' : 'Começar'}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}

function TrainingRound({ state, dispatch }: { state: Extract<ReturnType<typeof trainingReducer>, { phase: 'round' }>; dispatch: (a: Parameters<typeof trainingReducer>[1]) => void }) {
  const [pin, setPin] = useState<LatLng | null>(null);
  const view = useMemo(() => initialView(state.map.id), [state.map.id]);
  return (
    <div className="play">
      <StreetViewer imageId={state.point.imageId} movement={state.settings.movement} onError={() => dispatch({ type: 'skip', now: Date.now() })} />
      <div className="hud-top">
        <div className="hud-pill">
          <span className="hud-label">Rodada</span>
          <strong>{state.round}</strong>
          <span className="hud-label">de {state.settings.rounds}</span>
        </div>
        {state.deadline && <Countdown deadline={state.deadline} onExpire={() => dispatch({ type: 'guess', guess: null })} />}
      </div>
      <div className="hud-bottom-left">
        <Attribution className="attribution hud-attrib" />
      </div>
      <div className="guess-panel">
        <div className="guess-map">
          <GuessMap value={pin} onChange={setPin} view={view} />
        </div>
        <button type="button" className="btn btn-primary btn-lg" disabled={!pin} onClick={() => dispatch({ type: 'guess', guess: pin })}>
          {pin ? 'Chutar' : 'Clique no mapa para marcar'}
        </button>
      </div>
    </div>
  );
}

function Summary({ state, onAgain, onSetup }: { state: Extract<ReturnType<typeof trainingReducer>, { phase: 'summary' }>; onAgain: () => void; onSetup: () => void }) {
  const navigate = useNavigate();
  const saved = useRef<{ best: number; isNew: boolean } | null>(null);
  if (!saved.current) saved.current = saveRecord(recordKey(state.settings), state.total);
  const record = saved.current;
  useEffect(() => {
    // Em Chrome recente scrollTo devolve uma Promise; o efeito não pode retorná-la como "cleanup".
    window.scrollTo(0, 0);
  }, []);
  return (
    <div className="page">
      <header className="topbar">
        <Logo size={22} />
      </header>
      <main className="narrow">
        <p className="eyebrow">Treino · {mapName(state.settings.mapId)}</p>
        <h1 className="page-title">{formatPoints(state.total)} pontos</h1>
        <p className="muted">
          {record.isNew ? 'Novo recorde!' : `Seu recorde nessa configuração: ${formatPoints(record.best)}`}
        </p>
        <ol className="rank-list">
          {state.results.map((r, i) => (
            <li key={i} className="rank-row">
              <span className="rank-n">{i + 1}</span>
              <span className="rank-name">{r.answer.regiao}</span>
              <span className="muted tabular">{r.distanceKm !== null ? formatKm(r.distanceKm) : 'sem palpite'}</span>
              <span className="rank-score">{formatPoints(r.score)}</span>
            </li>
          ))}
        </ol>
        <div className="row wrap">
          <button type="button" className="btn btn-primary btn-lg" onClick={onAgain}>Jogar de novo</button>
          <button type="button" className="btn btn-outline btn-lg" onClick={onSetup}>Mudar configurações</button>
          <button type="button" className="btn btn-outline btn-lg" onClick={() => navigate('/')}>Início</button>
        </div>
      </main>
    </div>
  );
}
