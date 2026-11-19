import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { Logo } from '../components/Logo';
import { PinAvatar } from '../avatar/PinAvatar';
import { getAvatar } from '../avatar/storage';
import { getNick } from '../lib/session';

export const normalizeCode = (input: string) => input.toUpperCase().replace(/[^A-Z0-9]/g, '');

function Cloud({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg aria-hidden="true" className={`cloud ${className ?? ''}`} style={style} width="150" height="70" viewBox="0 0 150 70">
      <path d="M30 60 Q8 60 10 42 Q12 26 32 28 Q36 8 60 10 Q84 6 90 28 Q112 22 120 40 Q140 42 138 58 Q136 62 128 60 Z" fill="#FFFFFF" stroke="#17231E" strokeWidth="4" strokeLinejoin="round" />
    </svg>
  );
}

export function Home() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [avatar] = useState(() => getAvatar());
  const nick = getNick();
  const clean = normalizeCode(code);

  const enter = (e: FormEvent) => {
    e.preventDefault();
    if (clean.length === 4) navigate(`/sala/${clean}`);
  };

  return (
    <div className="home">
      <Cloud className="drift" style={{ top: 90, left: '5%' }} />
      <Cloud className="drift" style={{ top: 170, right: '6%', transform: 'scale(0.8)', animationDelay: '-4s' }} />
      <svg aria-hidden="true" className="home-contours" viewBox="0 0 1280 800" preserveAspectRatio="none">
        <path d="M-20 740 C 200 670, 360 770, 560 710 S 940 660, 1300 730" fill="none" stroke="#1A7A50" strokeWidth="4" strokeDasharray="4 14" strokeLinecap="round" />
      </svg>

      <header className="topbar">
        <Logo />
        <Link to="/avatar" className="me-chip" aria-label={nick ? `Você é ${nick}. Editar seu alfinete` : 'Escolher apelido e alfinete'}>
          <PinAvatar avatar={avatar} size={36} title="" />
          <strong>{nick || 'Seu alfinete'}</strong>
          <span>editar</span>
        </Link>
      </header>

      <main className="home-main">
        <div className="home-hero">
          <div className="bob">
            <PinAvatar avatar={avatar} size={150} title="Seu alfinete" />
          </div>
          <div>
            <h1>Onde Tô?</h1>
            <p className="lead">Caia num lugar qualquer, olhe em volta e crave seu alfinete. Quanto mais perto, mais pontos!</p>
          </div>
        </div>

        <div className="home-cards">
          <section className="card card-orange lift">
            <h2>Criar sala</h2>
            <p>Ao vivo com a galera na chamada. Clássico ou Duelo em times.</p>
            <button type="button" className="btn btn-light" onClick={() => navigate('/sala/nova')}>
              Criar sala
            </button>
          </section>

          <form className="card lift" onSubmit={enter}>
            <h2>Tenho um código</h2>
            <label htmlFor="codigo">O que o amigo mandou no chat</label>
            <div className="row">
              <input id="codigo" className="input input-code" placeholder="K7QX" autoComplete="off" value={code} onChange={(e) => setCode(e.target.value)} />
              <button type="submit" className="btn btn-primary" disabled={clean.length !== 4}>
                Entrar
              </button>
            </div>
          </form>

          <section className="card card-sky lift">
            <h2>Neste PC</h2>
            <p>Sozinho pra treinar, ou com a galera revezando no mesmo computador.</p>
            <button type="button" className="btn btn-light" onClick={() => navigate('/local')}>
              Jogar aqui
            </button>
          </section>
        </div>
      </main>

      <footer className="home-footer">
        <span>
          Fotos: <a href="https://www.mapillary.com" target="_blank" rel="noreferrer">© Mapillary</a> · Mapa: © OpenStreetMap
        </span>
        <span>Feito pra jogar com os amigos</span>
      </footer>
    </div>
  );
}
