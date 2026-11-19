import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const css = (f: string) => readFileSync(join(__dirname, '..', 'src', 'styles', f), 'utf8');
const token = (name: string) => css('tokens.css').match(new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6})`))![1];
const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

test('texto do time A sobre o fundo do time A passa 4.5:1', () => {
  expect(contrast(token('team-a-text'), token('team-a-soft'))).toBeGreaterThanOrEqual(4.5);
  expect(contrast(token('team-b-text'), token('team-b-soft'))).toBeGreaterThanOrEqual(4.5);
});

test('jogador offline no lobby não esmaece o texto (só o avatar)', () => {
  expect(css('global.css')).not.toMatch(/\.player-row\[data-offline\]\s*\{[^}]*opacity/);
});
