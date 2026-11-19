import { useMemo } from 'react';
import { DEFAULT_AVATAR, type RoomView } from '@onde-to/shared';
import { ResultMap, type ResultGuess } from '../../components/ResultMap';
import { Attribution } from '../../components/Attribution';
import { HpBars } from '../../components/HpBars';
import { mapName } from '../../game/loadMap';
import { formatKm, formatPoints } from '../../lib/format';
import type { Send } from '../../lib/socket';
import { Avatar } from './Avatar';
import { AutoNext } from './AutoNext';
import { isDuel, isLastRound, nickOf, playerColor, sortByTotal, TEAM_NAME } from './helpers';

interface Props {
  view: RoomView;
  me: string;
  offsetMs: number;
  send: Send;
}

export function RoundResult({ view, me, offsetMs, send }: Props) {
  const result = view.result!;
  const duel = isDuel(view);
  const iAmHost = !!view.players.find((p) => p.id === me)?.isHost;
  const last = isLastRound(view);
  const ranked = [...result.guesses].sort((a, b) => b.score - a.score);
  const guesses: ResultGuess[] = useMemo(
    () =>
      result.guesses.map((g) => ({
        guess: g.guess,
        label: nickOf(view, g.playerId),
        avatar: view.players.find((p) => p.id === g.playerId)?.avatar ?? DEFAULT_AVATAR,
      })),
    // o resultado de uma rodada não muda; refazer o mapa só quando a rodada mudar
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [result.round, result.answer.imageId],
  );

  return (
    <div className="result-layout">
      <section className="result-map" aria-label="Mapa do resultado">
        <ResultMap answer={result.answer} guesses={guesses} />
      </section>
      <aside className="result-side">
        <div>
          <p className="eyebrow">
            Rodada {result.round}{!duel && ` de ${view.settings.rounds}`} · {mapName(view.settings.mapId)}
          </p>
          <h1 className="result-title">Era em {result.answer.regiao}</h1>
          <Attribution autor={result.answer.autor} className="attribution muted" />
        </div>

        {duel && result.duel && view.duelHp && (
          <div className="card compact">
            <p className="duel-scores" data-testid="team-scores">
              <span className="hp-name-A">{TEAM_NAME.A}: {formatPoints(result.duel.teamScores.A)}</span>
              {' · '}
              <span className="hp-name-B">{TEAM_NAME.B}: {formatPoints(result.duel.teamScores.B)}</span>
            </p>
            <p className="duel-summary">
              {result.duel.damagedTeam
                ? `${TEAM_NAME[result.duel.damagedTeam]} perdeu ${formatPoints(result.duel.damage)} de vida${result.duel.multiplier > 1 ? ` (${String(result.duel.multiplier).replace('.', ',')}×)` : ''}`
                : 'Empate — ninguém perdeu vida'}
            </p>
            <HpBars hp={view.duelHp} startHp={view.settings.duelStartHp} />
          </div>
        )}

        <ol className="rank-list" data-testid="round-table">
          {ranked.map((g, i) => (
            <li key={g.playerId} className="rank-row">
              <span className="rank-n">{i + 1}</span>
              <Avatar nick={nickOf(view, g.playerId)} color={playerColor(view, g.playerId)} />
              <span className="rank-name">
                {nickOf(view, g.playerId)} {g.playerId === me && <span className="muted">(você)</span>}
              </span>
              <span className="muted tabular">{g.distanceKm !== null ? formatKm(g.distanceKm) : 'sem palpite'}</span>
              <span className="rank-score">{formatPoints(g.score)}</span>
            </li>
          ))}
        </ol>

        {!duel && (
          <div className="card compact">
            <h2 className="small-title">Placar da partida</h2>
            {sortByTotal(view.players.filter((p) => !p.spectator)).map((p) => (
              <div key={p.id} className="score-line">
                <span>{p.nick}</span>
                <strong className="tabular">{formatPoints(p.total)}</strong>
              </div>
            ))}
          </div>
        )}

        <div className="push-down stack-8">
          {iAmHost ? (
            <button type="button" className="btn btn-primary btn-lg btn-block" onClick={() => send('round:next')}>
              {last ? 'Ver resultado final' : 'Próxima rodada'}
            </button>
          ) : (
            <p className="muted center-text">Esperando o dono da sala…</p>
          )}
          {view.nextAt && <AutoNext at={view.nextAt} offsetMs={offsetMs} label={last ? 'Resultado final' : 'Próxima rodada'} />}
        </div>
      </aside>
    </div>
  );
}
