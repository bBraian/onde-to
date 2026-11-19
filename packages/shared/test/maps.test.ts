import { createDeck, mulberry32, MAP_CATALOG, type GameMap } from '../src/index';
import teste from '../maps/teste.json';

test('createDeck não repete e esgota', () => {
  const pts = Array.from({ length: 5 }, (_, i) => ({ imageId: `${i}`, lat: 0, lng: i, regiao: 'x' }));
  const deck = createDeck(pts, mulberry32(1));
  expect(deck.remaining()).toBe(5);
  const ids = [1, 2, 3, 4, 5].map(() => deck.draw()!.imageId);
  expect(new Set(ids).size).toBe(5);
  expect(deck.draw()).toBeNull();
  expect(deck.remaining()).toBe(0);
});

test('mulberry32 é determinístico', () => {
  const a = mulberry32(42), b = mulberry32(42);
  expect([a(), a(), a()]).toEqual([b(), b(), b()]);
});

test('catálogo tem os quatro mapas da spec', () => {
  expect(MAP_CATALOG.map((m) => m.id)).toEqual(['brasil', 'capitais-br', 'capitais-mundo', 'mundo']);
});

test('mapa de teste tem 10 pontos falsos', () => {
  const m = teste as GameMap;
  expect(m.id).toBe('teste');
  expect(m.tamanhoKm).toBe(4000);
  expect(m.pontos.map((p) => p.imageId)).toEqual(Array.from({ length: 10 }, (_, i) => `fake-${i + 1}`));
});
