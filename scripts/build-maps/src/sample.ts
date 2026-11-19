import { haversineKm, type LatLng } from '@onde-to/shared';

export interface MlyImage {
  id: string;
  lat: number;
  lng: number;
  quality: number | null;
  creator: string | null;
  /** Sequência do Mapillary de onde o candidato veio (permite sortear outra foto dela). */
  sequence?: string;
}

export function pickImage(images: MlyImage[], minQuality: number, rng: () => number): MlyImage | null {
  const ok = images.filter((i) => i.quality === null || i.quality >= minQuality);
  if (ok.length === 0) return null;
  return ok[Math.floor(rng() * ok.length)];
}

export function tooClose(p: LatLng, chosen: LatLng[], minKm: number): boolean {
  return chosen.some((c) => haversineKm(p, c) < minKm);
}

/** Diagonal (haversine) do retângulo que envolve todos os pontos. */
export function mapSizeKm(points: LatLng[]): number {
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  return haversineKm(
    { lat: Math.min(...lats), lng: Math.min(...lngs) },
    { lat: Math.max(...lats), lng: Math.max(...lngs) },
  );
}

/** Reparte `total` proporcionalmente a `weights` (método D'Hondt), com mínimo e teto por item. */
export function allocateTargets(weights: number[], total: number, opts: { min?: number; cap?: number } = {}): number[] {
  const min = opts.min ?? 0;
  const cap = opts.cap ?? Infinity;
  const t = weights.map(() => min);
  let remaining = total - min * weights.length;
  while (remaining > 0) {
    let best = -1;
    let bestQ = -1;
    for (let i = 0; i < weights.length; i++) {
      if (t[i] >= cap) continue;
      const q = weights[i] / (t[i] + 1);
      if (q > bestQ) { bestQ = q; best = i; }
    }
    if (best < 0) break;
    t[best]++;
    remaining--;
  }
  return t;
}

/** Ponto uniforme dentro de um disco de raio `radiusKm`. */
export function randomInDisk(center: LatLng, radiusKm: number, rng: () => number): LatLng {
  const d = radiusKm * Math.sqrt(rng());
  const theta = 2 * Math.PI * rng();
  const dLat = (d * Math.cos(theta)) / 111.32;
  const dLng = (d * Math.sin(theta)) / (111.32 * Math.cos((center.lat * Math.PI) / 180));
  return { lat: center.lat + dLat, lng: center.lng + dLng };
}
