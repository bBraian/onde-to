import type { Avatar } from '@onde-to/shared';
import { pinSvg } from './pinSvg';

interface Props {
  avatar: Avatar;
  size: number;
  title?: string;
  className?: string;
}

/**
 * Avatar "Alfinete". O SVG vem de pinSvg, que só aceita valores da lista (seguro para innerHTML).
 * `title=""` marca o avatar como decorativo (ao lado do nome): fica escondido do leitor de tela.
 */
export function PinAvatar({ avatar, size, title, className }: Props) {
  const decorative = title === '';
  return (
    <span
      {...(decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': title ?? 'Avatar' })}
      data-avatar=""
      className={className ? `pin-avatar ${className}` : 'pin-avatar'}
      style={{ width: size, height: Math.round((size * 7) / 6) }}
      dangerouslySetInnerHTML={{ __html: pinSvg(avatar, size) }}
    />
  );
}
