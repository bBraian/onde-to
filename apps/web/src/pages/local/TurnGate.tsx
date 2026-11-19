import { PinAvatar } from '../../avatar/PinAvatar';
import type { LocalPlayer } from '../../game/local';

export function TurnGate({ player, round, rounds, onReady }: { player: LocalPlayer; round: number; rounds: number; onReady: () => void }) {
  return (
    <div className="turn-gate">
      <p className="eyebrow">Rodada {round} de {rounds}</p>
      <div className="pop">
        <div className="bob">
          <PinAvatar avatar={player.avatar} size={170} title={`Alfinete de ${player.nick}`} />
        </div>
      </div>
      <h1>Vez de {player.nick}</h1>
      <p className="lead">Os outros: nada de espiar a tela!</p>
      <button type="button" className="btn btn-primary btn-lg" autoFocus onClick={onReady}>
        Tô pronto!
      </button>
    </div>
  );
}
