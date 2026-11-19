import type { GameMap, LatLng, MapPoint } from '@onde-to/shared';
import { FatalSearchError } from './mapillary';
import { mapSizeKm, pickImage, tooClose, type MlyImage } from './sample';

export interface Region {
  name: string;
  target: number;
  sample(rng: () => number): LatLng;
  /** Quando existe, a imagem precisa estar dentro da região (evita rótulo errado perto de fronteiras). */
  contains?(p: LatLng): boolean;
}

export interface MapSpec {
  id: string;
  nome: string;
  regions: Region[];
  minKm: number;
  fixedSizeKm?: number;
  /** Zoom dos tiles de cobertura usados para achar candidatos (padrão 12, ~10 km). */
  tileZoom?: number;
}

export const MIN_QUALITY = 0.5;
export const MIN_POINTS = 100;

/** A spec exige pelo menos 100 pontos para um mapa ir para o jogo. */
export function isPublishable(map: GameMap): boolean {
  return map.pontos.length >= MIN_POINTS;
}

export async function buildMap(
  spec: MapSpec,
  search: (p: LatLng) => Promise<MlyImage[]>,
  rng: () => number,
  maxAttemptsPerPoint = 20,
  concurrency = 1,
  /** Posição exata e autor da imagem escolhida (os candidatos podem ter posição aproximada). */
  resolve?: (img: MlyImage) => Promise<MlyImage | null>,
): Promise<{ map: GameMap; report: Record<string, { target: number; got: number }> }> {
  const pontos: MapPoint[] = [];
  const usedIds = new Set<string>();
  const tried = new Set<string>();
  const report: Record<string, { target: number; got: number }> = {};

  async function fillRegion(region: Region) {
    report[region.name] = { target: region.target, got: 0 };
    const maxAttempts = maxAttemptsPerPoint * region.target;
    for (let attempt = 0; attempt < maxAttempts && report[region.name].got < region.target; attempt++) {
      let images: MlyImage[];
      try {
        images = await search(region.sample(rng));
      } catch (err) {
        if (err instanceof FatalSearchError) throw err;
        continue; // falha passageira: conta como tentativa sem imagem
      }
      const candidates = images.filter(
        (i) => !usedIds.has(i.id) && !tried.has(i.id) && (!region.contains || region.contains(i)),
      );
      const pick = pickImage(candidates, MIN_QUALITY, rng);
      if (!pick) continue;
      let img = pick;
      if (resolve) {
        tried.add(pick.id);
        let exact: MlyImage | null;
        try {
          exact = await resolve(pick);
        } catch (err) {
          if (err instanceof FatalSearchError) throw err;
          continue;
        }
        if (!exact || (region.contains && !region.contains(exact))) continue;
        img = { ...exact, quality: exact.quality ?? pick.quality };
      }
      if (usedIds.has(img.id) || tooClose(img, pontos, spec.minKm)) continue;
      usedIds.add(img.id);
      pontos.push({ imageId: img.id, lat: img.lat, lng: img.lng, regiao: region.name, ...(img.creator ? { autor: img.creator } : {}) });
      report[region.name].got++;
    }
  }

  const queue = spec.regions.slice();
  const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
    for (let r = queue.shift(); r; r = queue.shift()) await fillRegion(r);
  });
  await Promise.all(workers);

  const tamanhoKm = spec.fixedSizeKm ?? (pontos.length > 1 ? Math.round(mapSizeKm(pontos) * 10) / 10 : 0);
  return { map: { id: spec.id, nome: spec.nome, tamanhoKm, pontos }, report };
}
