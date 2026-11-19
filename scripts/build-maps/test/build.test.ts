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
