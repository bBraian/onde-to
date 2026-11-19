import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { Logo } from '../../components/Logo';
import { PinAvatar } from '../../avatar/PinAvatar';
import { mapName } from '../../game/loadMap';
import { formatKm, formatPoints } from '../../lib/format';
import { celebrate } from '../../lib/motion';
import { recordKey, saveRecord } from '../../lib/records';
import type { LocalState } from '../../game/local';
import { totalLabel } from './LocalResult';

type Final = Extract<LocalState, { phase: 'final' }>;

export function LocalFinal({ state, onAgain, onSetup }: { state: Final; onAgain: () => void; onSetup: () => void }) {
  const navigate = useNavigate();
  const { players, settings, totals, winners, history } = state;
  const solo = players.length === 1;
  const record = useRef<{ best: number; isNew: boolean } | null>(null);
  if (solo && settings.scoring === 'distance' && !record.current) {
    record.current = saveRecord(
      recordKey({ mapId: settings.mapId, rounds: settings.rounds, roundTimeSec: settings.timeSec, movement: settings.movement }),
      totals[players[0].id] ?? 0,
    );
  }
  useEffect(() => {
    if (!solo || record.current?.isNew) celebrate('podium');
    window.scrollTo(0, 0);
  }, [solo]);

  const nick = (id: string) => players.find((p) => p.id === id)!.nick;
  const headline = solo
    ? `${formatPoints(totals[players[0].id] ?? 0)} pontos`
    : winners.length === players.length
      ? 'Empate geral!'
      : `${winners.map(nick).join(' e ')} ${winners.length > 1 ? 'venceram' : 'venceu'}!`;
  const ranked = [...players].sort((a, b) => (totals[b.id] ?? 0) - (totals[a.id] ?? 0));

  return (
    <div className="page">
      <header className="topbar">
        <Logo />
      </header>
      <main className="narrow">
        <p className="eyebrow">Neste PC · {mapName(settings.mapId)}</p>
        <h1 className="page-title" data-testid="winner">{headline}</h1>
        {solo && record.current && (
          <p className="lead">{record.current.isNew ? 'Novo recorde!' : `Seu recorde nessa configuração: ${formatPoints(record.current.best)}`}</p>
        )}

        {solo ? (
          <ol className="rank-list">
            {history.map((r) => {
              const g = r.guesses[0];
              return (
                <li key={r.round} className="rank-row">
                  <span className="rank-n">{r.round}</span>
                  <span className="rank-name">{r.answer.regiao}</span>
                  <span className="muted tabular">{g.distanceKm !== null ? formatKm(g.distanceKm) : 'sem palpite'}</span>
                  <span className="rank-score">{formatPoints(g.score)}</span>
                </li>
              );
            })}
          </ol>
        ) : (
          <ol className="rank-list">
            {ranked.map((p, i) => (
              <li key={p.id} className={`rank-row pop${winners.includes(p.id) ? ' rank-first' : ''}`} style={{ animationDelay: `${i * 60}ms` }}>
                <span className="rank-n">{i + 1}</span>
                <PinAvatar avatar={p.avatar} size={40} title="" />
                <span className="rank-name">{p.nick}</span>
                <span className="rank-score">{totalLabel(totals[p.id] ?? 0, settings.scoring)}</span>
              </li>
            ))}
          </ol>
        )}

        <div className="row wrap">
          <button type="button" className="btn btn-primary btn-lg" onClick={onAgain}>Jogar de novo</button>
          <button type="button" className="btn btn-outline btn-lg" onClick={onSetup}>{solo ? 'Mudar regras' : 'Mudar jogadores'}</button>
          <button type="button" className="btn btn-outline btn-lg" onClick={() => navigate('/')}>Início</button>
        </div>
      </main>
    </div>
  );
}
