import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { Logo } from '../components/Logo';

export const normalizeCode = (input: string) => input.toUpperCase().replace(/[^A-Z0-9]/g, '');

export function Home() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const clean = normalizeCode(code);

  const enter = (e: FormEvent) => {
    e.preventDefault();
    if (clean.length === 4) navigate(`/sala/${clean}`);
  };

  return (
    <div className="home">
      <svg aria-hidden="true" className="home-contours" viewBox="0 0 1280 800" preserveAspectRatio="xMidYMid slice">
        <g fill="none" stroke="var(--green)" strokeOpacity="0.09" strokeWidth="1.5">
          <path d="M-40 620 C 180 560, 320 700, 560 640 S 980 520, 1320 600" />
          <path d="M-40 660 C 200 600, 340 740, 580 680 S 1000 560, 1320 640" />
          <path d="M-40 700 C 220 640, 360 780, 600 720 S 1020 600, 1320 680" />
          <path d="M980 40 C 1060 90, 1180 60, 1320 120" />
          <path d="M940 70 C 1040 130, 1170 100, 1320 170" />
          <path d="M-40 120 C 80 160, 160 90, 300 130" />
          <path d="M-40 160 C 100 200, 180 130, 330 170" />
        </g>
      </svg>

      <header className="topbar">
        <Logo />
      </header>

      <main className="home-main">
        <div className="home-hero">
          <p className="eyebrow">Fotos de rua · palpite no mapa · pontos pela distância</p>
          <h1>De que canto do mundo é essa rua?</h1>
          <p className="lead">Caia num lugar qualquer, olhe em volta e marque no mapa onde acha que está. Quanto mais perto, mais pontos.</p>
        </div>

        <div className="home-cards">
          <section className="card card-dark">
            <h2>Criar sala</h2>
            <p>Jogue ao vivo com a galera na chamada. Clássico ou Duelo em times.</p>
            <button type="button" className="btn btn-light" onClick={() => navigate('/sala/nova')}>
              Criar sala
            </button>
          </section>

          <form className="card" onSubmit={enter}>
            <h2>Entrar com código</h2>
            <label htmlFor="codigo">Código que o amigo mandou no chat</label>
            <div className="row">
              <input
                id="codigo"
                className="input input-code"
                placeholder="K7QX"
                autoComplete="off"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <button type="submit" className="btn btn-primary" disabled={clean.length !== 4}>
                Entrar
              </button>
            </div>
          </form>

          <section className="card">
            <h2>Treino</h2>
            <p>Só você, no seu ritmo. Bata o seu recorde em cada mapa.</p>
            <button type="button" className="btn btn-outline" onClick={() => navigate('/treino')}>
              Treinar
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
