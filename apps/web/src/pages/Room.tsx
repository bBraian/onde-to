import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Logo } from '../components/Logo';
import { getNick, setNick } from '../lib/session';
import { NEW_ROOM, useRoom } from '../lib/socket';
import { Lobby } from './room/Lobby';
import { RoundView } from './room/RoundView';
import { RoundResult } from './room/RoundResult';
import { Finished } from './room/Finished';
import { providerMismatch } from './room/helpers';

/** Provedor de imagens deste site (o Task 8 passa a ler da configuração). */
const SITE_PROVIDER = 'mapillary' as const;

export function Room() {
  const { code = NEW_ROOM } = useParams();
  const [nick, setNickState] = useState<string | null>(() => getNick() || null);
  const [askNick, setAskNick] = useState(!nick);
  if (askNick || !nick) {
    return (
      <NickForm
        creating={code === NEW_ROOM}
        initial={nick ?? ''}
        onSubmit={(n) => {
          setNick(n);
          setNickState(n);
          setAskNick(false);
        }}
      />
    );
  }
  return <RoomSession key={nick} code={code} nick={nick} onBadNick={() => setAskNick(true)} />;
}

function RoomSession({ code, nick, onBadNick }: { code: string; nick: string; onBadNick: () => void }) {
  const navigate = useNavigate();
  const { view, me, offsetMs, status, send } = useRoom(code.toUpperCase() === NEW_ROOM.toUpperCase() ? NEW_ROOM : code, nick, (created) =>
    navigate(`/sala/${created}`, { replace: true }),
  );
  const leave = () => {
    send('room:leave');
    navigate('/');
  };

  if (status === 'invalid_nick') {
    onBadNick();
    return null;
  }
  if (status === 'not_found' || status === 'full') {
    return (
      <Message title={status === 'full' ? 'Sala cheia' : 'Sala não encontrada'}>
        {status === 'full' ? 'Essa sala já tem 8 jogadores.' : 'Confira o código com quem te mandou o link.'}
        <Link to="/" className="btn btn-primary">Voltar ao início</Link>
      </Message>
    );
  }
  if (status !== 'joined' || !view || !me) {
    return (
      <Message title={status === 'waking' ? 'Acordando o servidor…' : 'Conectando…'}>
        {status === 'waking' ? 'Ele dorme quando ninguém joga. Pode levar até 1 minuto.' : null}
      </Message>
    );
  }

  if (providerMismatch(view, SITE_PROVIDER)) {
    return (
      <Message title="Configuração diferente">
        Servidor e site usam provedores diferentes (servidor: {view.provider}, site: {SITE_PROVIDER}).
        <Link to="/" className="btn btn-primary">Voltar ao início</Link>
      </Message>
    );
  }

  switch (view.phase) {
    case 'lobby':
      return <Lobby view={view} me={me} send={send} onLeave={leave} />;
    case 'round':
      return <RoundView key={`${view.round?.number}-${view.round?.imageId}`} view={view} me={me} offsetMs={offsetMs} send={send} />;
    case 'result':
      return <RoundResult view={view} me={me} offsetMs={offsetMs} send={send} />;
    case 'finished':
      return <Finished view={view} me={me} send={send} onLeave={leave} />;
  }
}

function NickForm({ creating, initial, onSubmit }: { creating: boolean; initial: string; onSubmit: (nick: string) => void }) {
  const [value, setValue] = useState(initial);
  const clean = value.trim().replace(/\s+/g, ' ').slice(0, 20);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (clean) onSubmit(clean);
  };
  return (
    <div className="page">
      <header className="topbar">
        <Logo size={22} />
      </header>
      <main className="narrow">
        <form className="card settings-card" onSubmit={submit}>
          <h1 className="page-title">{creating ? 'Criar sala' : 'Entrar na sala'}</h1>
          <div className="field">
            <label htmlFor="apelido">Como a galera vai te ver?</label>
            <input id="apelido" className="input" maxLength={20} autoFocus value={value} onChange={(e) => setValue(e.target.value)} placeholder="Seu apelido" />
          </div>
          <button type="submit" className="btn btn-primary btn-lg" disabled={!clean}>
            {creating ? 'Criar sala' : 'Entrar'}
          </button>
        </form>
      </main>
    </div>
  );
}

function Message({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="page">
      <header className="topbar">
        <Logo size={22} />
      </header>
      <div className="center-msg">
        <h1 className="page-title">{title}</h1>
        {children}
      </div>
    </div>
  );
}
