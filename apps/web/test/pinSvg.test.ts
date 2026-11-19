import { pinSvg } from '../src/avatar/pinSvg';

test('pinSvg inclui só as partes escolhidas e a cor', () => {
  const s = pinSvg({ color: '#3A86FF', eyes: 'oculos', mouth: 'risada', acc: 'coroa' }, 64);
  expect(s).toContain('fill="#3A86FF"');
  expect(s).toContain('data-part="eyes-oculos"');
  expect(s).toContain('data-part="mouth-risada"');
  expect(s).toContain('data-part="acc-coroa"');
  expect(s).not.toContain('data-part="eyes-normal"');
  expect(s).toContain('width="64"');
  expect(s).toContain('height="75"');
});

test('pinSvg sem acessório não desenha chapéu', () => {
  expect(pinSvg({ color: '#FF6B35', eyes: 'normal', mouth: 'sorriso', acc: 'nenhum' }, 40)).not.toContain('data-part="acc-');
});

test('pinSvg não injeta valor fora da lista', () => {
  const s = pinSvg({ color: '"/><script>alert(1)</script>', eyes: 'x' as never, mouth: 'sorriso', acc: 'nenhum' }, 10);
  expect(s).not.toContain('<script>');
  expect(s).toContain('fill="#FF6B35"');
});
