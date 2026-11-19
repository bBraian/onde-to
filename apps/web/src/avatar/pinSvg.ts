import { sanitizeAvatar, type Avatar } from '@onde-to/shared';

const INK = '#17231E';
const S = `stroke="${INK}"`;

const EYES: Record<Avatar['eyes'], string> = {
  normal: `<ellipse cx="46" cy="55" rx="6" ry="8" fill="${INK}"/><ellipse cx="74" cy="55" rx="6" ry="8" fill="${INK}"/><circle cx="48" cy="52" r="2.2" fill="#fff"/><circle cx="76" cy="52" r="2.2" fill="#fff"/>`,
  feliz: `<path d="M39 58 Q46 47 53 58" fill="none" ${S} stroke-width="4.5" stroke-linecap="round"/><path d="M67 58 Q74 47 81 58" fill="none" ${S} stroke-width="4.5" stroke-linecap="round"/>`,
  oculos: `<rect x="33" y="47" width="23" height="15" rx="6" fill="${INK}"/><rect x="64" y="47" width="23" height="15" rx="6" fill="${INK}"/><path d="M56 52 H64" ${S} stroke-width="4"/><path d="M38 51 H45" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity="0.7"/>`,
  piscando: `<ellipse cx="46" cy="55" rx="6" ry="8" fill="${INK}"/><circle cx="48" cy="52" r="2.2" fill="#fff"/><path d="M67 56 Q74 61 81 56" fill="none" ${S} stroke-width="4.5" stroke-linecap="round"/>`,
  brilho: `<circle cx="46" cy="55" r="10" fill="#fff" ${S} stroke-width="3"/><circle cx="74" cy="55" r="10" fill="#fff" ${S} stroke-width="3"/><circle cx="47" cy="57" r="5.5" fill="${INK}"/><circle cx="75" cy="57" r="5.5" fill="${INK}"/><circle cx="49" cy="54" r="2" fill="#fff"/><circle cx="77" cy="54" r="2" fill="#fff"/>`,
};

const MOUTH: Record<Avatar['mouth'], string> = {
  sorriso: `<path d="M50 72 Q60 82 70 72" fill="none" ${S} stroke-width="4.5" stroke-linecap="round"/>`,
  risada: `<path d="M47 70 Q60 90 73 70 Z" fill="${INK}" ${S} stroke-width="3" stroke-linejoin="round"/><path d="M53 76 Q60 84 67 76 Q60 80 53 76 Z" fill="#FF6F91"/>`,
  lingua: `<ellipse cx="63" cy="79" rx="5" ry="6" fill="#FF6F91" ${S} stroke-width="3"/><path d="M50 72 Q60 80 70 72" fill="none" ${S} stroke-width="4.5" stroke-linecap="round"/>`,
  surpreso: `<ellipse cx="60" cy="76" rx="6" ry="7" fill="${INK}"/>`,
};

/** Partes de acessório desenhadas atrás do corpo (aba do chapéu, arco do fone). */
const ACC_BACK: Partial<Record<Avatar['acc'], string>> = {
  explorador: `<ellipse cx="60" cy="30" rx="50" ry="9" fill="#D9B77E" ${S} stroke-width="4.5"/>`,
  fone: `<path d="M13 60 A47 47 0 0 1 107 60" fill="none" ${S} stroke-width="11" stroke-linecap="round"/><path d="M13 60 A47 47 0 0 1 107 60" fill="none" stroke="#3A86FF" stroke-width="5" stroke-linecap="round"/>`,
};

const ACC_FRONT: Record<Exclude<Avatar['acc'], 'nenhum'>, string> = {
  bone: `<path d="M86 32 Q106 29 113 38 Q98 43 84 39 Z" fill="#3A86FF" ${S} stroke-width="4.5" stroke-linejoin="round"/><path d="M29 36 Q31 6 60 6 Q89 6 91 36 Z" fill="#3A86FF" ${S} stroke-width="5" stroke-linejoin="round"/><circle cx="60" cy="7" r="3.5" fill="${INK}"/>`,
  explorador: `<path d="M34 30 Q36 3 60 3 Q84 3 86 30 Z" fill="#E8C98F" ${S} stroke-width="4.5" stroke-linejoin="round"/><path d="M36 23 H84" stroke="#8D5A2B" stroke-width="5"/>`,
  fone: `<rect x="4" y="46" width="17" height="28" rx="7" fill="#3A86FF" ${S} stroke-width="4"/><rect x="99" y="46" width="17" height="28" rx="7" fill="#3A86FF" ${S} stroke-width="4"/>`,
  coroa: `<path d="M37 24 L41 2 L51 14 L60 0 L69 14 L79 2 L83 24 Z" fill="#FFC93C" ${S} stroke-width="4.5" stroke-linejoin="round"/><circle cx="60" cy="17" r="3" fill="#E63946"/>`,
  gorro: `<path d="M25 38 Q27 7 60 7 Q93 7 95 38 Z" fill="#E63946" ${S} stroke-width="5" stroke-linejoin="round"/><rect x="21" y="31" width="78" height="12" rx="6" fill="#F7F3E8" ${S} stroke-width="4"/><circle cx="60" cy="7" r="8" fill="#F7F3E8" ${S} stroke-width="4"/>`,
};

/**
 * SVG do avatar "Alfinete" (o desenho do mockup Pin.dc.html). Os valores passam por sanitizeAvatar,
 * então só cores e partes da lista chegam à string.
 */
export function pinSvg(input: Avatar, size: number): string {
  const a = sanitizeAvatar(input);
  const w = Math.round(size);
  const h = Math.round((size * 7) / 6);
  const back = ACC_BACK[a.acc] ? `<g data-part="acc-${a.acc}-back">${ACC_BACK[a.acc]}</g>` : '';
  const front = a.acc === 'nenhum' ? '' : `<g data-part="acc-${a.acc}">${ACC_FRONT[a.acc]}</g>`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 140" width="${w}" height="${h}" aria-hidden="true" focusable="false">` +
    `<ellipse cx="60" cy="133" rx="24" ry="5" fill="${INK}" opacity="0.18"/>` +
    back +
    `<path d="M60 126 C52 116 18 86 18 56 A42 42 0 1 1 102 56 C102 86 68 116 60 126 Z" fill="${a.color}" ${S} stroke-width="5" stroke-linejoin="round"/>` +
    `<path d="M30 46 A31 31 0 0 1 50 23" fill="none" stroke="#fff" stroke-opacity="0.6" stroke-width="5" stroke-linecap="round"/>` +
    `<ellipse cx="37" cy="68" rx="6" ry="4" fill="#FF8FAB" opacity="0.85"/><ellipse cx="83" cy="68" rx="6" ry="4" fill="#FF8FAB" opacity="0.85"/>` +
    `<g data-part="eyes-${a.eyes}">${EYES[a.eyes]}</g>` +
    `<g data-part="mouth-${a.mouth}">${MOUTH[a.mouth]}</g>` +
    front +
    `</svg>`
  );
}
