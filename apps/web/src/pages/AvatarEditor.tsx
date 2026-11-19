import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { AVATAR_COLORS, AVATAR_PARTS, randomAvatar, type Avatar } from '@onde-to/shared';
import { Logo } from '../components/Logo';
import { PinAvatar } from '../avatar/PinAvatar';
import { getAvatar, setAvatar } from '../avatar/storage';
import { getNick, setNick } from '../lib/session';

export const cleanNick = (n: string) => n.trim().replace(/\s+/g, ' ').slice(0, 20);

interface PanelProps {
  value: Avatar;
  nick: string;
  onChange: (avatar: Avatar, nick: string) => void;
  /** Cores que outro jogador já usa (modo "Neste PC"): ficam desativadas. */
  takenColors?: string[];
}

/** Painel do editor: prévia, apelido, sortear e as escolhas. Usado na página /avatar e no modal do modo local. */
export function AvatarEditorPanel({ value, nick, onChange, takenColors = [] }: PanelProps) {
  const set = (patch: Partial<Avatar>) => onChange({ ...value, ...patch }, nick);
  const group = <K extends 'eyes' | 'mouth' | 'acc'>(key: K, title: string) => (
    <div className="stack-8">
      <h2 className="eyebrow">{title}</h2>
      <div className="row wrap">
        {AVATAR_PARTS[key].map((o) => (
          <button key={o.id} type="button" className="chip" aria-pressed={value[key] === o.id} onClick={() => set({ [key]: o.id } as Partial<Avatar>)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="editor">
      <section className="card editor-preview">
        <div className="editor-stage">
          <div className="bob">
            <PinAvatar avatar={value} size={200} title={`Avatar de ${nick || 'você'}`} />
          </div>
        </div>
        <div className="field editor-nick">
          <label htmlFor="apelido">Apelido</label>
          <input id="apelido" className="input" maxLength={20} value={nick} onChange={(e) => onChange(value, e.target.value)} placeholder="Como a galera vai te ver?" />
        </div>
        <button
          type="button"
          className="btn btn-yellow btn-block"
          onClick={() => onChange(randomAvatar(Math.random, takenColors.filter((c) => c !== value.color)), nick)}
        >
          Sortear um visual
        </button>
      </section>

      <section className="card editor-options">
        <div>
          <h1 className="page-title">Monte seu alfinete</h1>
          <p>No mapa, o seu palpite é você. Escolha como a galera vai te ver.</p>
        </div>
        <div className="stack-8">
          <h2 className="eyebrow">Cor</h2>
          <div className="row wrap">
            {AVATAR_COLORS.map((c) => (
              <button
                key={c.hex}
                type="button"
                className="swatch"
                aria-label={c.name}
                aria-pressed={value.color === c.hex}
                disabled={takenColors.includes(c.hex) && value.color !== c.hex}
                style={{ background: c.hex }}
                onClick={() => set({ color: c.hex })}
              />
            ))}
          </div>
        </div>
        {group('eyes', 'Olhos')}
        {group('mouth', 'Boca')}
        {group('acc', 'Acessório')}
      </section>
    </div>
  );
}

/** Página /avatar: edita o avatar e o apelido salvos. `?volta=/caminho` decide para onde ir ao salvar. */
export function AvatarEditor() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [avatar, setAvatarState] = useState<Avatar>(() => getAvatar());
  const [nick, setNickState] = useState(() => getNick());
  const clean = cleanNick(nick);
  const back = params.get('volta');
  const target = back && back.startsWith('/') && !back.startsWith('//') ? back : '/';

  const save = () => {
    if (!clean) return;
    setAvatar(avatar);
    setNick(clean);
    navigate(target);
  };

  return (
    <div className="page">
      <header className="topbar">
        <Logo />
      </header>
      <main className="editor-page">
        <AvatarEditorPanel
          value={avatar}
          nick={nick}
          onChange={(a, n) => {
            setAvatarState(a);
            setNickState(n);
          }}
        />
        <div className="editor-actions">
          <button type="button" className="btn btn-outline btn-lg" onClick={() => navigate(target)}>
            Cancelar
          </button>
          <button type="button" className="btn btn-primary btn-lg" disabled={!clean} onClick={save}>
            Salvar e jogar
          </button>
        </div>
      </main>
    </div>
  );
}
