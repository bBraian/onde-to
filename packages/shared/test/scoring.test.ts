import { haversineKm, scoreFor, scoreGuess, WORLD_SIZE_KM } from '../src/index';

test('haversineKm São Paulo → Rio', () => {
  expect(haversineKm({ lat: -23.5505, lng: -46.6333 }, { lat: -22.9068, lng: -43.1729 })).toBeCloseTo(360.75, 1);
});

test('antípodas ≈ 20015 km', () => {
  expect(haversineKm({ lat: 0, lng: 0 }, { lat: 0, lng: 180 })).toBeCloseTo(20015.11, 1);
});

test('scoreFor segue 5000·e^(−10·d/D) com 5000 até 25 m', () => {
  expect(scoreFor(1000, WORLD_SIZE_KM)).toBe(2558);
  expect(scoreFor(1000, 4000)).toBe(410);
  expect(scoreFor(0.03, 100)).toBe(4985);
  expect(scoreFor(0.025, 100)).toBe(5000);
  expect(scoreFor(0, 100)).toBe(5000);
});

test('scoreGuess sem palpite vale 0', () => {
  expect(scoreGuess(null, { lat: 0, lng: 0 }, 100)).toEqual({ distanceKm: null, score: 0 });
});

test('scoreGuess com palpite devolve distância e pontos', () => {
  const r = scoreGuess({ lat: -23.5505, lng: -46.6333 }, { lat: -22.9068, lng: -43.1729 }, 4000);
  expect(r.distanceKm).toBeCloseTo(360.75, 1);
  expect(r.score).toBe(scoreFor(r.distanceKm!, 4000));
});

import { roundPoints } from '../src/index';

test('roundPoints: o mais próximo faz 1; empate até 1 m; sem palpite faz 0', () => {
  expect(roundPoints([{ playerId: 'a', distanceKm: 10 }, { playerId: 'b', distanceKm: 3 }, { playerId: 'c', distanceKm: null }]))
    .toEqual({ a: 0, b: 1, c: 0 });
  expect(roundPoints([{ playerId: 'a', distanceKm: 3.0005 }, { playerId: 'b', distanceKm: 3 }])).toEqual({ a: 1, b: 1 });
  expect(roundPoints([{ playerId: 'a', distanceKm: 3.002 }, { playerId: 'b', distanceKm: 3 }])).toEqual({ a: 0, b: 1 });
  expect(roundPoints([{ playerId: 'a', distanceKm: null }])).toEqual({ a: 0 });
});
