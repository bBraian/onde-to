import { mulberry32 } from '@onde-to/shared';
import { buildMap } from '../src/build';

test('buildMap atinge o alvo, não repete e reporta', async () => {
  let n = 0;
  const search = async () => [{ id: `img${n++}`, lat: n * 0.5, lng: n * 0.5, quality: 0.9, creator: 'ana' }];
  const region = { name: 'R', target: 4, sample: () => ({ lat: 0, lng: 0 }) };
  const { map, report } = await buildMap({ id: 'x', nome: 'X', regions: [region], minKm: 1 }, search, mulberry32(1));
  expect(map.pontos).toHaveLength(4);
  expect(new Set(map.pontos.map((p) => p.imageId)).size).toBe(4);
  expect(report.R).toEqual({ target: 4, got: 4 });
  expect(map.pontos[0].autor).toBe('ana');
  expect(map.pontos[0].regiao).toBe('R');
  expect(map.tamanhoKm).toBeGreaterThan(0);
});

test('buildMap para depois do limite de tentativas quando não há cobertura', async () => {
  let calls = 0;
  const { report } = await buildMap(
    { id: 'x', nome: 'X', regions: [{ name: 'R', target: 2, sample: () => ({ lat: 0, lng: 0 }) }], minKm: 1 },
    async () => { calls++; return []; }, mulberry32(1), 5,
  );
  expect(report.R.got).toBe(0);
  expect(calls).toBe(10);
});

test('buildMap descarta pontos próximos demais e usa fixedSizeKm', async () => {
  const search = async () => [{ id: `same${Math.random()}`, lat: 0, lng: 0, quality: 0.9, creator: null }];
  const { map } = await buildMap(
    { id: 'x', nome: 'X', regions: [{ name: 'R', target: 3, sample: () => ({ lat: 0, lng: 0 }) }], minKm: 1, fixedSizeKm: 14916.862 },
    search, mulberry32(1), 3,
  );
  expect(map.pontos).toHaveLength(1);
  expect(map.tamanhoKm).toBe(14916.862);
});

import { FatalSearchError } from '../src/mapillary';
import { isPublishable, MIN_POINTS } from '../src/build';

test('buildMap descarta imagem fora da região', async () => {
  let n = 0;
  const search = async () => {
    n++;
    return [{ id: `i${n}`, lat: n % 2 ? -1 - n : 1 + n, lng: n, quality: 0.9, creator: null }];
  };
  const region = { name: 'Norte', target: 3, sample: () => ({ lat: 0, lng: 0 }), contains: (p: { lat: number }) => p.lat > 0 };
  const { map } = await buildMap({ id: 'x', nome: 'X', regions: [region], minKm: 1 }, search, mulberry32(1));
  expect(map.pontos).toHaveLength(3);
  expect(map.pontos.every((p) => p.lat > 0)).toBe(true);
});

test('erro passageiro numa busca não derruba o mapa', async () => {
  let n = 0;
  const search = async () => {
    n++;
    if (n === 2) throw new Error('ECONNRESET');
    return [{ id: `i${n}`, lat: n, lng: n, quality: 0.9, creator: null }];
  };
  const { map } = await buildMap({ id: 'x', nome: 'X', regions: [{ name: 'R', target: 3, sample: () => ({ lat: 0, lng: 0 }) }], minKm: 1 }, search, mulberry32(1));
  expect(map.pontos).toHaveLength(3);
});

test('erro fatal (token inválido) interrompe o mapa', async () => {
  const search = async () => { throw new FatalSearchError('HTTP 401'); };
  await expect(buildMap({ id: 'x', nome: 'X', regions: [{ name: 'R', target: 3, sample: () => ({ lat: 0, lng: 0 }) }], minKm: 1 }, search, mulberry32(1))).rejects.toThrow(FatalSearchError);
});

test('mapa com menos de 100 pontos não é publicável', () => {
  const pts = (n: number) => Array.from({ length: n }, (_, i) => ({ imageId: `${i}`, lat: 0, lng: 0, regiao: 'R' }));
  expect(MIN_POINTS).toBe(100);
  expect(isPublishable({ id: 'x', nome: 'X', tamanhoKm: 1, pontos: pts(99) })).toBe(false);
  expect(isPublishable({ id: 'x', nome: 'X', tamanhoKm: 1, pontos: pts(100) })).toBe(true);
});

test('usa a posição exata e o autor que o resolve devolve', async () => {
  const search = async () => [{ id: 'a', lat: 0, lng: 0, quality: 0.9, creator: null }];
  const resolve = async () => ({ id: 'a', lat: 5, lng: 6, quality: 0.9, creator: 'caio' });
  const { map } = await buildMap({ id: 'x', nome: 'X', regions: [{ name: 'R', target: 1, sample: () => ({ lat: 0, lng: 0 }) }], minKm: 1 }, search, mulberry32(1), 20, 1, resolve);
  expect(map.pontos).toEqual([{ imageId: 'a', lat: 5, lng: 6, regiao: 'R', autor: 'caio' }]);
});

test('candidato que o resolve não acha é descartado', async () => {
  let n = 0;
  const search = async () => [{ id: `c${++n}`, lat: n, lng: n, quality: 0.9, creator: null }];
  const resolve = async (i: { id: string; lat: number; lng: number }) => (i.id === 'c1' ? null : { ...i, quality: 0.9, creator: null });
  const { map } = await buildMap({ id: 'x', nome: 'X', regions: [{ name: 'R', target: 1, sample: () => ({ lat: 0, lng: 0 }) }], minKm: 1 }, search, mulberry32(1), 20, 1, resolve);
  expect(map.pontos.map((p) => p.imageId)).toEqual(['c2']);
});
