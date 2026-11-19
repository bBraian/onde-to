import { useMemo, useState } from 'react';
import { duelMultiplier, type LatLng, type RoomView } from '@onde-to/shared';
import { StreetViewer } from '../../components/StreetViewer';
import { GuessMap } from '../../components/GuessMap';
import { Countdown } from '../../components/Countdown';
import { Attribution } from '../../components/Attribution';
import { HpBars } from '../../components/HpBars';
import { initialView } from '../../components/mapStyle';
import type { Send } from '../../lib/socket';
import { Avatar } from './Avatar';
import { activePlayers, isDuel, playerColor } from './helpers';

interface Props {
  view: RoomView;
  me: string;
  offsetMs: number;
  send: Send;
}

export function RoundView({ view, me, offsetMs, send }: Props) {
  const round = view.round!;
  const [pin, setPin] = useState<LatLng | null>(null);
  const [imageBroken, setImageBroken] = useState(false);
  const mapView = useMemo(() => initialView(view.settings.mapId), [view.settings.mapId]);
  const self = view.players.find((p) => p.id === me);
  const iAmHost = !!self?.isHost;
  const spectator = !!self?.spectator;
  const guessed = !!self?.hasGuessed;
  const duel = isDuel(view);
  const s = view.settings;
  const mult = duel ? duelMultiplier(round.number, s.duelMultiplierStartRound, s.duelMultiplierStep) : 1;
  const firstGuesser = activePlayers(view).find((p) => p.hasGuessed && p.id !== me);

  return (
    <div className="play">
      <StreetViewer imageId={round.imageId} movement={s.movement} onError={() => setImageBroken(true)} />

      <div className="hud-top">
        <div className="hud-pill">
          <span className="hud-label">Rodada</span>
          <strong data-testid="round-number">{round.number}</strong>
          {!duel && <span className="hud-label">de {s.rounds}</span>}
          {duel && mult > 1 && <span className="hud-mult">dano {String(mult).replace('.', ',')}×</span>}
        </div>
        {duel && view.duelHp && (
          <div className="hud-hp">
            <HpBars hp={view.duelHp} startHp={s.duelStartHp} dark />
          </div>
        )}
        {round.deadline && <Countdown deadline={round.deadline} offsetMs={offsetMs} />}
      </div>

      <div className="hud-right">
        {duel && firstGuesser && !guessed && <span className="hud-note">{firstGuesser.nick} já chutou — corre!</span>}
        <ul className="guessed-list" aria-label="Quem já chutou">
          {activePlayers(view).map((p) => (
            <li key={p.id}>
              <Avatar nick={p.nick} color={playerColor(view, p.id)} dimmed={!p.connected} ring={p.hasGuessed ? 'var(--guessed)' : 'var(--hud)'} />
              <span className="sr-only">{p.hasGuessed ? `${p.nick} já chutou` : `${p.nick} ainda não chutou`}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="hud-bottom-left">
        {iAmHost && (
          <div className="row wrap">
            <button type="button" className="btn btn-ghost-light" onClick={() => { setImageBroken(false); send('round:reroll'); }}>
              Trocar local
            </button>
            <button type="button" className="btn btn-ghost-light" onClick={() => send('round:end')}>
              Encerrar rodada
            </button>
          </div>
        )}
        {imageBroken && iAmHost && <span className="hud-note">A foto não carregou? Use “Trocar local”.</span>}
        <Attribution className="attribution hud-attrib" />
      </div>

      <div className="guess-panel">
        {spectator ? (
          <p className="hud-note big">Você está assistindo. Entra na próxima partida.</p>
        ) : (
          <>
            <div className="guess-map">
              <GuessMap value={pin} onChange={setPin} disabled={guessed} view={mapView} />
            </div>
            <button
              type="button"
              className="btn btn-primary btn-lg"
              disabled={!pin || guessed}
              onClick={() => pin && send('round:guess', pin)}
            >
              {guessed ? 'Palpite enviado — esperando os outros' : pin ? 'Chutar' : 'Clique no mapa para marcar'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
