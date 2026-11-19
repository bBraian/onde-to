import type { Avatar } from '@onde-to/shared';
import { pinSvg } from './pinSvg';

interface Props {
  avatar: Avatar;
  size: number;
  title?: string;
  className?: string;
}

/** Avatar "Alfinete". O SVG vem de pinSvg, que só aceita valores da lista (seguro para innerHTML). */
export function PinAvatar({ avatar, size, title, className }: Props) {
  return (
    <span
      role="img"
      aria-label={title ?? 'Avatar'}
      data-avatar=""
      className={className ? `pin-avatar ${className}` : 'pin-avatar'}
      style={{ width: size, height: Math.round((size * 7) / 6) }}
      dangerouslySetInnerHTML={{ __html: pinSvg(avatar, size) }}
    />
  );
}
