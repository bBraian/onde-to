import { haversineKm, type LatLng } from './geo';

export const MAX_SCORE = 5000;
export const PERFECT_RADIUS_KM = 0.025;
export const WORLD_SIZE_KM = 14916.862;

/** Pontos de um palpite a `distanceKm` do local num mapa de tamanho `mapSizeKm`. */
export function scoreFor(distanceKm: number, mapSizeKm: number): number {
  if (distanceKm <= PERFECT_RADIUS_KM) return MAX_SCORE;
  return Math.round(MAX_SCORE * Math.exp((-10 * distanceKm) / mapSizeKm));
}

export function scoreGuess(
  guess: LatLng | null,
  answer: LatLng,
  mapSizeKm: number,
): { distanceKm: number | null; score: number } {
  if (!guess) return { distanceKm: null, score: 0 };
  const distanceKm = haversineKm(guess, answer);
  return { distanceKm, score: scoreFor(distanceKm, mapSizeKm) };
}
