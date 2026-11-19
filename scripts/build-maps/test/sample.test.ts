import { pickImage, tooClose, mapSizeKm } from '../src/sample';

test('pickImage filtra qualidade baixa', () => {
  expect(pickImage([{ id: '1', lat: 0, lng: 0, quality: 0.2, creator: null }], 0.5, () => 0)).toBeNull();
});

test('pickImage aceita qualidade nula', () => {
  expect(pickImage([{ id: '1', lat: 0, lng: 0, quality: null, creator: null }], 0.5, () => 0)?.id).toBe('1');
});

test('tooClose', () => {
  expect(tooClose({ lat: 0, lng: 0 }, [{ lat: 0, lng: 0.01 }], 5)).toBe(true);
  expect(tooClose({ lat: 0, lng: 0 }, [{ lat: 0, lng: 0.1 }], 5)).toBe(false);
});

test('mapSizeKm é a diagonal do retângulo envolvente', () => {
  expect(mapSizeKm([{ lat: 0, lng: 0 }, { lat: 0, lng: 1 }, { lat: 1, lng: 0 }])).toBeCloseTo(157.25, 0);
});

import { allocateTargets, randomInDisk } from '../src/sample';
import { haversineKm, mulberry32 } from '@onde-to/shared';

test('allocateTargets distribui pelo peso, com mínimo, teto e soma exata', () => {
  const t = allocateTargets([100, 10, 1, 1], 50, { min: 2 });
  expect(t.reduce((a, b) => a + b, 0)).toBe(50);
  expect(Math.min(...t)).toBeGreaterThanOrEqual(2);
  expect(t[0]).toBeGreaterThan(t[1]);
  const capped = allocateTargets([1000, 1, 1], 30, { min: 1, cap: 10 });
  expect(capped[0]).toBe(10);
});

test('randomInDisk fica dentro do raio', () => {
  const rng = mulberry32(3);
  for (let i = 0; i < 200; i++) {
    const p = randomInDisk({ lat: -23.55, lng: -46.63 }, 10, rng);
    expect(haversineKm(p, { lat: -23.55, lng: -46.63 })).toBeLessThanOrEqual(10.05);
  }
});
