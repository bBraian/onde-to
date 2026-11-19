import { Link } from 'react-router';
import { PinAvatar } from '../avatar/PinAvatar';

const LOGO_AVATAR = { color: '#FF6B35', eyes: 'feliz', mouth: 'sorriso', acc: 'nenhum' } as const;

export function Logo({ size = 30 }: { size?: number }) {
  return (
    <Link to="/" className="logo" aria-label="Onde Tô? — início">
      <PinAvatar avatar={LOGO_AVATAR} size={size + 10} title="" />
      <span style={{ fontSize: size }}>Onde Tô?</span>
    </Link>
  );
}
