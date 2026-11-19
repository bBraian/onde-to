import { viewerComponents } from '../src/components/viewerOptions';

test('visão fixa desliga navegação, ponteiro e zoom', () => {
  expect(viewerComponents('nmpz')).toEqual({
    attribution: false, cover: false, sequence: false, direction: false, keyboard: false, pointer: false, zoom: false,
  });
});

test('sem andar mantém girar e zoom', () => {
  const c = viewerComponents('no-move');
  expect(c).toMatchObject({ sequence: false, direction: false, keyboard: false, pointer: true, zoom: true });
});

test('pode andar liga navegação e sempre desliga créditos e capa padrão', () => {
  const c = viewerComponents('move');
  expect(c.sequence).toBeTruthy();
  expect(c.direction).toBeTruthy();
  expect(c).toMatchObject({ attribution: false, cover: false, keyboard: true, pointer: true, zoom: true });
});
