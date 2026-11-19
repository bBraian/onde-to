export type Eyes = 'normal' | 'feliz' | 'oculos' | 'piscando' | 'brilho';
export type Mouth = 'sorriso' | 'risada' | 'lingua' | 'surpreso';
export type Accessory = 'nenhum' | 'bone' | 'explorador' | 'fone' | 'coroa' | 'gorro';

export interface Avatar {
  color: string;
  eyes: Eyes;
  mouth: Mouth;
  acc: Accessory;
}

export const AVATAR_COLORS: { hex: string; name: string }[] = [
  { hex: '#FF6B35', name: 'Laranja' },
  { hex: '#1A7A50', name: 'Verde' },
  { hex: '#3A86FF', name: 'Azul' },
  { hex: '#FFC93C', name: 'Amarelo' },
  { hex: '#FF8FAB', name: 'Rosa' },
  { hex: '#2EC4B6', name: 'Turquesa' },
  { hex: '#8D6E63', name: 'Marrom' },
  { hex: '#E63946', name: 'Vermelho' },
];

export const AVATAR_PARTS: {
  eyes: { id: Eyes; label: string }[];
  mouth: { id: Mouth; label: string }[];
  acc: { id: Accessory; label: string }[];
} = {
  eyes: [
    { id: 'normal', label: 'Normal' },
    { id: 'feliz', label: 'Feliz' },
    { id: 'oculos', label: 'Óculos escuros' },
    { id: 'piscando', label: 'Piscadinha' },
    { id: 'brilho', label: 'Brilhando' },
  ],
  mouth: [
    { id: 'sorriso', label: 'Sorriso' },
    { id: 'risada', label: 'Risada' },
    { id: 'lingua', label: 'Linguinha' },
    { id: 'surpreso', label: 'Surpreso' },
  ],
  acc: [
    { id: 'nenhum', label: 'Nada' },
    { id: 'bone', label: 'Boné' },
    { id: 'explorador', label: 'Chapéu de explorador' },
    { id: 'fone', label: 'Fone' },
    { id: 'coroa', label: 'Coroa' },
    { id: 'gorro', label: 'Gorro' },
  ],
};

export const DEFAULT_AVATAR: Avatar = { color: '#FF6B35', eyes: 'normal', mouth: 'sorriso', acc: 'explorador' };

const pickFrom = <T extends string>(value: unknown, allowed: readonly { id: T }[], fallback: T): T =>
  allowed.some((a) => a.id === value) ? (value as T) : fallback;

/** Avatar válido a partir de qualquer valor (localStorage antigo, cliente mexido): campo inválido vira o padrão. */
export function sanitizeAvatar(x: unknown): Avatar {
  const o = x && typeof x === 'object' ? (x as Record<string, unknown>) : {};
  const hex = typeof o.color === 'string' ? o.color.toUpperCase() : '';
  return {
    color: AVATAR_COLORS.some((c) => c.hex === hex) ? hex : DEFAULT_AVATAR.color,
    eyes: pickFrom(o.eyes, AVATAR_PARTS.eyes, DEFAULT_AVATAR.eyes),
    mouth: pickFrom(o.mouth, AVATAR_PARTS.mouth, DEFAULT_AVATAR.mouth),
    acc: pickFrom(o.acc, AVATAR_PARTS.acc, DEFAULT_AVATAR.acc),
  };
}

/** Avatar sorteado; usa uma cor fora de `avoidColors` quando houver. */
export function randomAvatar(rng: () => number, avoidColors: string[] = []): Avatar {
  const one = <T>(list: T[]): T => list[Math.floor(rng() * list.length)];
  const free = AVATAR_COLORS.filter((c) => !avoidColors.includes(c.hex));
  return {
    color: one(free.length ? free : AVATAR_COLORS).hex,
    eyes: one(AVATAR_PARTS.eyes).id,
    mouth: one(AVATAR_PARTS.mouth).id,
    acc: one(AVATAR_PARTS.acc).id,
  };
}
