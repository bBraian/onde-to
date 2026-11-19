import { useMemo, useState } from 'react';
import type { LatLng } from '@onde-to/shared';
import { StreetViewer } from '../../components/StreetViewer';
import { GuessMap, type MapPin } from '../../components/GuessMap';
import { Countdown } from '../../components/Countdown';
import { Attribution } from '../../components/Attribution';
import { initialView } from '../../components/mapStyle';
import { PinAvatar } from '../../avatar/PinAvatar';
import { visiblePins, type LocalAction, type LocalState } from '../../game/local';

type Guessing = Extract<LocalState, { phase: 'guessing' }>;

export function LocalRound({ state, dispatch }: { state: Guessing; dispatch: (a: LocalAction) => void }) {
  const [pin, setPin] = useState<LatLng | null>(null);
  const view = useMemo(() => initialView(state.map.id), [state.map.id]);
  const sameMap = state.players.length > 1 && state.settings.guessMode === 'same-map';
  const active = state.players.find((p) => p.id === state.activeId)!;
  const avatarOf = (id: string) => state.players.find((p) => p.id === id)!.avatar;

  const pins: MapPin[] = sameMap
    ? visiblePins(state).map((v) => ({ id: v.playerId, avatar: avatarOf(v.playerId), guess: v.guess }))
    : pin
      ? [{ id: active.id, avatar: active.avatar, guess: pin }]
      : [];
  const missing = state.players.filter((p) => !state.pending[p.id]).length;

  return (
    <div className="play">
      <StreetViewer imageId={state.point.imageId} movement={state.settings.movement} onError={() => dispatch({ type: 'skip', now: Date.now() })} />

      <div className="hud-top">
        <div className="hud-pill">
          <span className="hud-label">Rodada</span>
          <strong>{state.round}</strong>
          <span className="hud-label">de {state.settings.rounds}</span>
        </div>
        {!sameMap && state.players.length > 1 && (
          <span className="turn-chip">
            <PinAvatar avatar={active.avatar} size={30} title="" />
            Vez de {active.nick}
          </span>
        )}
        {state.deadline && (
          <Countdown
            deadline={state.deadline}
            onExpire={() => dispatch(sameMap ? { type: 'timeout' } : { type: 'guess', guess: null, now: Date.now() })}
          />
        )}
      </div>

      <div className="hud-bottom-left">
        <Attribution className="attribution hud-attrib" />
      </div>

      <div className="guess-panel">
        {sameMap && (
          <div className="player-chips" role="group" aria-label="De quem é o pino">
            {state.players.map((p) => (
              <button
                key={p.id}
                type="button"
                className="player-chip"
                aria-pressed={p.id === state.activeId}
                data-done={state.pending[p.id] ? '' : undefined}
                onClick={() => dispatch({ type: 'select', playerId: p.id })}
              >
                <PinAvatar avatar={p.avatar} size={28} title="" />
                {p.nick}
              </button>
            ))}
          </div>
        )}
        <div className="guess-map">
          <GuessMap pins={pins} onPick={(p) => (sameMap ? dispatch({ type: 'place', guess: p }) : setPin(p))} view={view} />
        </div>
        {sameMap ? (
          <>
            <button type="button" className="btn btn-primary btn-lg" disabled={missing > 0} onClick={() => dispatch({ type: 'reveal' })}>
              Revelar
            </button>
            {missing > 0 && <p className="hud-note center-text">Falta{missing > 1 ? 'm' : ''} {missing} marcar</p>}
          </>
        ) : (
          <button type="button" className="btn btn-primary btn-lg" disabled={!pin} onClick={() => dispatch({ type: 'guess', guess: pin, now: Date.now() })}>
            {pin ? 'Chutar' : 'Clique no mapa para marcar'}
          </button>
        )}
      </div>
    </div>
  );
}
