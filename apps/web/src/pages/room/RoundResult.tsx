import { useEffect, useMemo, useRef } from 'react';
import { DEFAULT_AVATAR, roundPoints, type RoomView } from '@onde-to/shared';
import { ResultMap, type ResultGuess } from '../../components/ResultMap';
import { Attribution } from '../../components/Attribution';
import { HpBars } from '../../components/HpBars';
import { PinAvatar } from '../../avatar/PinAvatar';
import { mapName } from '../../game/loadMap';
import { formatKm, formatPoints } from '../../lib/format';
import { celebrate, useCountUp } from '../../lib/motion';
import { remainingSec } from '../../lib/clock';
import type { Send } from '../../lib/socket';
import { AutoNext } from './AutoNext';
import { avatarOf, isDuel, isLastRound, nickOf, sortByTotal, TEAM_NAME } from './helpers';

interface Props {
  view: RoomView;
  me: string;
  offsetMs: number;
  send: Send;
}

export function RoundResult({ view, me, offsetMs, send }: Props) {
  const result = view.result!;
  const duel = isDuel(view);
  const byRounds = !duel && view.settings.scoring === 'rounds';
  const iAmHost = !!view.players.find((p) => p.id === me)?.isHost;
  const last = isLastRound(view);
  const points = byRounds ? roundPoints(result.guesses) : null;
  const ranked = [...result.guesses].sort((a, b) => (points ? points[b.playerId] - points[a.playerId] : 0) || b.score - a.score);
  const mine = result.guesses.find((g) => g.playerId === me);
  const shown = useCountUp(mine?.score ?? 0);
  const guesses: ResultGuess[] = useMemo(
    () =>
      result.guesses.map((g) => ({ guess: g.guess, label: nickOf(view, g.playerId), avatar: avatarOf(view, g.playerId) ?? DEFAULT_AVATAR })),
    // o resultado de uma rodada não muda; refazer só quando a rodada mudar
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [result.round, result.answer.imageId],
  );
  const celebrated = useRef(false);
  useEffect(() => {
    if (!celebrated.current && mine?.score === 5000) {
      celebrated.current = true;
      celebrate('perfect');
    }
  }, [mine?.score]);
  const autoTotalSec = view.settings.autoAdvanceSec ?? 0;

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
          <h1 className="result-title">Era em {result.answer.regiao}!</h1>
          <Attribution autor={result.answer.autor} className="attribution muted" />
        </div>

        {mine && (
          <div className="score-sticker pop" aria-live="polite">
            <span>{mine.guess ? `Você errou por ${formatKm(mine.distanceKm!)}` : 'Você não chutou'}</span>
            <strong>+{formatPoints(shown)}</strong>
          </div>
        )}

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
                : 'Empate, ninguém perdeu vida'}
            </p>
            <HpBars hp={view.duelHp} startHp={view.settings.duelStartHp} shakeTeam={result.duel.damagedTeam} />
          </div>
        )}

        <ol className="rank-list" data-testid="round-table">
          {ranked.map((g, i) => (
            <li key={g.playerId} className={`rank-row${i === 0 && g.guess ? ' rank-first' : ''}`}>
              <span className="rank-n">{i + 1}</span>
              <PinAvatar avatar={avatarOf(view, g.playerId) ?? DEFAULT_AVATAR} size={32} title="" />
              <span className="rank-name">
                {nickOf(view, g.playerId)} {g.playerId === me && <span className="muted">(você)</span>}
              </span>
              <span className="muted tabular">{g.distanceKm !== null ? formatKm(g.distanceKm) : 'sem palpite'}</span>
              {points ? (
                points[g.playerId] > 0 ? <span className="rank-plus">+1 ponto</span> : <span className="rank-score">0</span>
              ) : (
                <span className="rank-score">{formatPoints(g.score)}</span>
              )}
            </li>
          ))}
        </ol>

        {!duel && (
          <div className="card compact">
            <h2 className="small-title">Placar da partida</h2>
            {sortByTotal(view.players.filter((p) => !p.spectator)).map((p) => (
              <div key={p.id} className="score-line">
                <span className="row" style={{ alignItems: 'center' }}>
                  <PinAvatar avatar={p.avatar} size={24} title="" />
                  {p.nick}
                </span>
                <strong className="tabular">{byRounds ? `${p.total} ${p.total === 1 ? 'ponto' : 'pontos'}` : formatPoints(p.total)}</strong>
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
            <p className="center-text">Esperando o dono da sala…</p>
          )}
          {view.nextAt && autoTotalSec > 0 && (
            <>
              <div className="next-bar" aria-hidden="true">
                <div
                  key={view.nextAt}
                  className="shrink"
                  style={{
                    animationDuration: `${autoTotalSec}s`,
                    animationDelay: `-${Math.max(0, autoTotalSec - remainingSec(view.nextAt, Date.now(), offsetMs))}s`,
                  }}
                />
              </div>
              <AutoNext at={view.nextAt} offsetMs={offsetMs} label={last ? 'Resultado final' : 'Próxima rodada'} />
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
