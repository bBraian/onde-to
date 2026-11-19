import { AVATAR_COLORS, AVATAR_PARTS, DEFAULT_AVATAR, mulberry32, randomAvatar, sanitizeAvatar } from '../src/index';

test('8 cores na ordem da spec', () => {
  expect(AVATAR_COLORS.map((c) => c.hex)).toEqual(['#FF6B35', '#1A7A50', '#3A86FF', '#FFC93C', '#FF8FAB', '#2EC4B6', '#8D6E63', '#E63946']);
  expect(AVATAR_PARTS.acc.map((a) => a.label)).toEqual(['Nada', 'Boné', 'Chapéu de explorador', 'Fone', 'Coroa', 'Gorro']);
});

test('sanitizeAvatar corrige campo a campo', () => {
  expect(sanitizeAvatar(null)).toEqual(DEFAULT_AVATAR);
  expect(sanitizeAvatar({ color: '#123456', eyes: 'feliz', mouth: 'x', acc: 'coroa' }))
    .toEqual({ color: '#FF6B35', eyes: 'feliz', mouth: 'sorriso', acc: 'coroa' });
  expect(sanitizeAvatar('<svg onload=1>')).toEqual(DEFAULT_AVATAR);
  expect(sanitizeAvatar({ color: '#3a86ff' }).color).toBe('#3A86FF');
});

test('randomAvatar evita cores usadas e é válido', () => {
  const used = AVATAR_COLORS.slice(0, 7).map((c) => c.hex);
  expect(randomAvatar(mulberry32(1), used).color).toBe(AVATAR_COLORS[7].hex);
  const a = randomAvatar(mulberry32(2));
  expect(sanitizeAvatar(a)).toEqual(a);
});
