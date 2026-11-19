import type { RoomView } from '@onde-to/shared';
import { Logo } from '../../components/Logo';
import { HpBars } from '../../components/HpBars';
import { formatPoints } from '../../lib/format';
import type { Send } from '../../lib/socket';
import { Avatar } from './Avatar';
import { isDuel, nickOf, playerColor, sortByTotal, TEAM_NAME } from './helpers';

interface Props {
  view: RoomView;
  me: string;
  send: Send;
  onLeave: () => void;
}

export function Finished({ view, me, send, onLeave }: Props) {
  const duel = isDuel(view);
  const iAmHost = !!view.players.find((p) => p.id === me)?.isHost;
  const w = view.winner;
  const headline = duel
    ? w && 'team' in w
      ? `${TEAM_NAME[w.team]} venceu!`
      : 'Empate!'
    : w && 'playerIds' in w && w.playerIds.length
      ? `${w.playerIds.map((id) => nickOf(view, id)).join(' e ')} ${w.playerIds.length > 1 ? 'venceram' : 'venceu'}!`
      : 'Fim de partida';
  const podium = sortByTotal(view.players.filter((p) => !p.spectator));

  return (
    <div className="page">
      <header className="topbar">
        <Logo size={22} />
      </header>
      <main className="narrow">
        <p className="eyebrow">Fim de partida · {view.history.length} {view.history.length === 1 ? 'rodada' : 'rodadas'}</p>
        <h1 className="page-title" data-testid="winner">{headline}</h1>

        {duel && view.duelHp ? (
          <div className="card compact">
            <HpBars hp={view.duelHp} startHp={view.settings.duelStartHp} />
          </div>
        ) : (
          <ol className="rank-list">
            {podium.map((p, i) => (
              <li key={p.id} className={`rank-row${i === 0 ? ' rank-first' : ''}`}>
                <span className="rank-n">{i + 1}</span>
                <Avatar nick={p.nick} color={playerColor(view, p.id)} />
                <span className="rank-name">{p.nick} {p.id === me && <span className="muted">(você)</span>}</span>
                <span className="rank-score">{formatPoints(p.total)}</span>
              </li>
            ))}
          </ol>
        )}

        <h2 className="small-title">Rodada a rodada</h2>
        <ol className="rank-list">
          {view.history.map((r) => {
            const best = [...r.guesses].sort((a, b) => b.score - a.score)[0];
            return (
              <li key={r.round} className="rank-row">
                <span className="rank-n">{r.round}</span>
                <span className="rank-name">{r.answer.regiao}</span>
                <span className="muted small">{best ? `melhor: ${nickOf(view, best.playerId)}` : ''}</span>
                <span className="rank-score">{best ? formatPoints(best.score) : '—'}</span>
              </li>
            );
          })}
        </ol>

        <div className="row wrap">
          {iAmHost ? (
            <button type="button" className="btn btn-primary btn-lg" onClick={() => send('room:lobby')}>Jogar de novo</button>
          ) : (
            <p className="muted">Esperando o dono da sala começar outra…</p>
          )}
          <button type="button" className="btn btn-outline btn-lg" onClick={onLeave}>Sair</button>
        </div>
      </main>
    </div>
  );
}
