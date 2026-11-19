import { useMemo, useReducer, useState } from 'react';
import { availableMaps, loadMap } from '../game/loadMap';
import { localReducer } from '../game/local';
import { loadLocalSetup, saveLocalSetup, type LocalSetup } from '../lib/localSetup';
import { Setup } from './local/Setup';
import { TurnGate } from './local/TurnGate';
import { LocalRound } from './local/LocalRound';
import { LocalResult } from './local/LocalResult';
import { LocalFinal } from './local/LocalFinal';

/** Modo "Neste PC": 1 a 8 jogadores no mesmo computador (com 1 é o treino). */
export function Local() {
  const maps = useMemo(() => availableMaps(), []);
  const [setup, setSetup] = useState<LocalSetup>(() => {
    const s = loadLocalSetup();
    const mapId = maps.some((m) => m.id === s.settings.mapId) ? s.settings.mapId : (maps[0]?.id ?? '');
    return { ...s, settings: { ...s.settings, mapId } };
  });
  const [state, dispatch] = useReducer(localReducer, { phase: 'setup' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    const players = setup.players.map((p, i) => ({ ...p, nick: p.nick.trim().replace(/\s+/g, ' ').slice(0, 20) || `Jogador ${i + 1}` }));
    const ready = { ...setup, players };
    setSetup(ready);
    saveLocalSetup(ready);
    setLoading(true);
    setError(null);
    try {
      const map = await loadMap(ready.settings.mapId);
      dispatch({ type: 'start', settings: ready.settings, players, map, rng: Math.random, now: Date.now() });
    } catch {
      setError('Não consegui carregar esse mapa.');
    } finally {
      setLoading(false);
    }
  };

  switch (state.phase) {
    case 'setup':
      return <Setup maps={maps} setup={setup} onChange={setSetup} onStart={start} loading={loading} error={error} />;
    case 'gate': {
      const player = state.players.find((p) => p.id === state.order[state.turnIndex])!;
      return <TurnGate key={`${state.round}-${player.id}`} player={player} round={state.round} rounds={state.settings.rounds} onReady={() => dispatch({ type: 'ready', now: Date.now() })} />;
    }
    case 'guessing':
      return <LocalRound key={`${state.round}-${state.point.imageId}-${state.settings.guessMode === 'turns' ? state.activeId : ''}`} state={state} dispatch={dispatch} />;
    case 'result':
      return <LocalResult state={state} dispatch={dispatch} />;
    case 'final':
      return <LocalFinal state={state} onAgain={start} onSetup={() => dispatch({ type: 'setup' })} />;
  }
}
