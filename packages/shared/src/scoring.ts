import { haversineKm, type LatLng } from './geo';

export const MAX_SCORE = 5000;
export const PERFECT_RADIUS_KM = 0.025;
export const WORLD_SIZE_KM = 14916.862;

/** Pontos de um palpite a `distanceKm` do local num mapa de tamanho `mapSizeKm`. */
export function scoreFor(distanceKm: number, mapSizeKm: number): number {
  if (distanceKm <= PERFECT_RADIUS_KM) return MAX_SCORE;
  return Math.round(MAX_SCORE * Math.exp((-10 * distanceKm) / mapSizeKm));
}

/** Tolerância de empate na pontuação "Rodada": 1 m. */
export const ROUND_TIE_KM = 0.001;

/** Pontuação "Rodada": quem tem a menor distância faz 1 ponto (empate até 1 m); sem palpite faz 0. */
export function roundPoints(results: { playerId: string; distanceKm: number | null }[]): Record<string, number> {
  const out: Record<string, number> = {};
  const dists = results.map((r) => r.distanceKm).filter((d): d is number => d !== null);
  const best = dists.length ? Math.min(...dists) : null;
  for (const r of results) out[r.playerId] = best !== null && r.distanceKm !== null && r.distanceKm - best <= ROUND_TIE_KM ? 1 : 0;
  return out;
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
