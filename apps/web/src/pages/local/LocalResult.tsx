import { useEffect, useMemo, useRef } from 'react';
import { ResultMap, type ResultGuess } from '../../components/ResultMap';
import { Attribution } from '../../components/Attribution';
import { PinAvatar } from '../../avatar/PinAvatar';
import { formatKm, formatPoints } from '../../lib/format';
import { celebrate, useCountUp } from '../../lib/motion';
import type { LocalAction, LocalState } from '../../game/local';

type Result = Extract<LocalState, { phase: 'result' }>;

export const totalLabel = (n: number, scoring: 'distance' | 'rounds') => (scoring === 'rounds' ? `${n} ${n === 1 ? 'ponto' : 'pontos'}` : formatPoints(n));

export function LocalResult({ state, dispatch }: { state: Result; dispatch: (a: LocalAction) => void }) {
  const { last, settings, players } = state;
  const solo = players.length === 1;
  const isLast = state.round >= settings.rounds || state.queue.length === 0;
  const byId = (id: string) => players.find((p) => p.id === id)!;
  const guesses: ResultGuess[] = useMemo(
    () => last.guesses.map((g) => ({ guess: g.guess, label: byId(g.playerId).nick, avatar: byId(g.playerId).avatar })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [last],
  );
  const ranked = [...last.guesses].sort((a, b) => b.points - a.points || b.score - a.score);
  const mine = last.guesses[0];
  const shown = useCountUp(solo ? mine.score : 0);
  const celebrated = useRef(false);
  useEffect(() => {
    if (!celebrated.current && last.guesses.some((g) => g.score === 5000)) {
      celebrated.current = true;
      celebrate('perfect');
    }
  }, [last]);

  return (
    <div className="result-layout">
      <section className="result-map" aria-label="Mapa do resultado">
        <ResultMap answer={last.answer} guesses={guesses} />
      </section>
      <aside className="result-side">
        <div>
          <p className="eyebrow">Rodada {last.round} de {settings.rounds} · {state.map.nome}</p>
          <h1 className="result-title">Era em {last.answer.regiao}!</h1>
          <Attribution autor={last.answer.autor} className="attribution muted" />
        </div>

        {solo ? (
          <div className="score-sticker pop" aria-live="polite">
            <span>{mine.guess ? `Você errou por ${formatKm(mine.distanceKm!)}` : 'O tempo acabou'}</span>
            <strong>+{formatPoints(shown)}</strong>
          </div>
        ) : (
          <ol className="rank-list" data-testid="round-table">
            {ranked.map((g, i) => (
              <li key={g.playerId} className={`rank-row${i === 0 && g.guess ? ' rank-first' : ''}`}>
                <span className="rank-n">{i + 1}</span>
                <PinAvatar avatar={byId(g.playerId).avatar} size={32} title="" />
                <span className="rank-name">{byId(g.playerId).nick}</span>
                <span className="muted tabular">{g.distanceKm !== null ? formatKm(g.distanceKm) : 'sem palpite'}</span>
                {settings.scoring === 'rounds' ? (
                  g.points > 0 ? <span className="rank-plus">+1</span> : <span className="rank-score">0</span>
                ) : (
                  <span className="rank-score">{formatPoints(g.score)}</span>
                )}
              </li>
            ))}
          </ol>
        )}

        {!solo && (
          <div className="card compact">
            <h2 className="small-title">Placar</h2>
            {[...players]
              .sort((a, b) => (state.totals[b.id] ?? 0) - (state.totals[a.id] ?? 0))
              .map((p) => (
                <div key={p.id} className="score-line">
                  <span className="row" style={{ alignItems: 'center' }}>
                    <PinAvatar avatar={p.avatar} size={24} title="" />
                    {p.nick}
                  </span>
                  <strong className="tabular">{totalLabel(state.totals[p.id] ?? 0, settings.scoring)}</strong>
                </div>
              ))}
          </div>
        )}
        {solo && <p className="muted">Total até agora: <strong>{formatPoints(state.totals[mine.playerId] ?? 0)}</strong></p>}

        <button type="button" className="btn btn-primary btn-lg btn-block push-down" onClick={() => dispatch({ type: 'next', now: Date.now() })}>
          {isLast ? 'Ver resultado final' : 'Próxima rodada'}
        </button>
      </aside>
    </div>
  );
}
