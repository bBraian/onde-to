import { VectorTile } from '@mapbox/vector-tile';
import { PbfReader } from 'pbf';
import type { LatLng } from '@onde-to/shared';
import type { MlyImage } from './sample';

// A busca por bbox da API (/images) falha com HTTP 500 em áreas densas mesmo com bbox pequeno.
// Por isso o script lê os tiles de cobertura (camada "sequence", que já marca is_pano e traz um image_id
// por sequência) e depois consulta a imagem escolhida pela API de entidade para ter a posição exata.

const TILE_URL = 'https://tiles.mapillary.com/maps/vtp/mly1_public/2';
const GRAPH_URL = 'https://graph.mapillary.com';
const DETAIL_FIELDS = 'id,computed_geometry,geometry,quality_score,creator';

/** Erro que não adianta repetir nem pular (token inválido ou sem permissão): aborta a geração do mapa. */
export class FatalSearchError extends Error {
  name = 'FatalSearchError';
}

const MAX_RETRIES = 3;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** GET com até 3 repetições em erro de rede, 429 e 5xx. 401/403 → FatalSearchError; outros erros → Error. */
export async function fetchWithRetry(url: string): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    let res: Response;
    try {
      res = await fetch(url);
    } catch (err) {
      if (attempt >= MAX_RETRIES) throw err;
      await sleep(1000 * 2 ** attempt);
      continue;
    }
    if (res.ok) return res;
    if (res.status === 401 || res.status === 403) throw new FatalSearchError(`Mapillary HTTP ${res.status}: ${await res.text()}`);
    const retriable = res.status === 429 || res.status >= 500;
    if (!retriable || attempt >= MAX_RETRIES) throw new Error(`Mapillary HTTP ${res.status}: ${await res.text()}`);
    await sleep(1000 * 2 ** attempt);
  }
}

/** Tile XYZ (Web Mercator) que contém o ponto. */
export function tileFor(p: LatLng, z: number): [number, number] {
  const n = 2 ** z;
  const lat = (Math.max(-85.0511, Math.min(85.0511, p.lat)) * Math.PI) / 180;
  const x = Math.floor(((p.lng + 180) / 360) * n);
  const y = Math.floor(((1 - Math.log(Math.tan(lat) + 1 / Math.cos(lat)) / Math.PI) / 2) * n);
  return [Math.min(n - 1, Math.max(0, x)), Math.min(n - 1, Math.max(0, y))];
}

/** [oeste, sul, leste, norte] do tile. */
export function tileBounds(z: number, x: number, y: number): [number, number, number, number] {
  const n = 2 ** z;
  const lng = (xx: number) => (xx / n) * 360 - 180;
  const lat = (yy: number) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * yy) / n))) * 180) / Math.PI;
  return [lng(x), lat(y + 1), lng(x + 1), lat(y)];
}

/** Candidatos 360° de um tile de cobertura: um por sequência, posição aproximada (primeiro vértice). */
export function parseSequenceTile(buf: Uint8Array, z: number, x: number, y: number): MlyImage[] {
  if (buf.length === 0) return [];
  const layer = new VectorTile(new PbfReader(buf)).layers['sequence'];
  if (!layer) return [];
  const seen = new Set<string>();
  const out: MlyImage[] = [];
  for (let i = 0; i < layer.length; i++) {
    const f = layer.feature(i);
    const props = f.properties as Record<string, unknown>;
    if (props.is_pano !== true || props.image_id === undefined) continue;
    const id = String(props.image_id);
    if (seen.has(id)) continue;
    const geom = f.toGeoJSON(x, y, z).geometry;
    const first =
      geom.type === 'LineString' ? geom.coordinates[0]
      : geom.type === 'MultiLineString' ? geom.coordinates[0]?.[0]
      : geom.type === 'Point' ? geom.coordinates
      : undefined;
    if (!first) continue;
    seen.add(id);
    const q = props.quality_score;
    const sequence = props.id === undefined ? undefined : String(props.id);
    out.push({ id, lat: first[1], lng: first[0], quality: typeof q === 'number' ? q : null, creator: null, ...(sequence ? { sequence } : {}) });
  }
  return out;
}

interface RawImage {
  id: string;
  computed_geometry?: { type?: string; coordinates: [number, number] };
  geometry?: { type?: string; coordinates: [number, number] };
  quality_score?: number | null;
  creator?: { username?: string; id?: string } | null;
}

/** Detalhes de uma imagem pela API de entidade; null se não tiver posição. */
export function parseImageDetails(r: RawImage): MlyImage | null {
  const coords = r.computed_geometry?.coordinates ?? r.geometry?.coordinates;
  if (!coords) return null;
  return { id: String(r.id), lat: coords[1], lng: coords[0], quality: r.quality_score ?? null, creator: r.creator?.username ?? null };
}

/**
 * Fonte de candidatos baseada nos tiles de cobertura, com cache por tile na memória.
 * `candidates(p)`: imagens 360° do tile que contém p. `resolve(img)`: posição exata e autor.
 */
export function createTileSource(token: string, zoom: number) {
  const cache = new Map<string, Promise<MlyImage[]>>();
  const sequenceImages = new Map<string, Promise<string[]>>();
  const auth = encodeURIComponent(token);

  const imagesOf = (sequence: string): Promise<string[]> => {
    let hit = sequenceImages.get(sequence);
    if (!hit) {
      hit = fetchWithRetry(`${GRAPH_URL}/image_ids?sequence_id=${encodeURIComponent(sequence)}&access_token=${auth}`)
        .then(async (res) => ((await res.json()) as { data?: { id: string }[] }).data?.map((d) => String(d.id)) ?? [])
        .catch((err) => {
          sequenceImages.delete(sequence);
          throw err;
        });
      sequenceImages.set(sequence, hit);
    }
    return hit;
  };

  return {
    candidates(p: LatLng): Promise<MlyImage[]> {
      const [x, y] = tileFor(p, zoom);
      const key = `${zoom}/${x}/${y}`;
      let hit = cache.get(key);
      if (!hit) {
        hit = fetchWithRetry(`${TILE_URL}/${key}?access_token=${auth}`)
          .then(async (res) => parseSequenceTile(new Uint8Array(await res.arrayBuffer()), zoom, x, y))
          .catch((err) => {
            cache.delete(key); // permite tentar de novo depois
            throw err;
          });
        cache.set(key, hit);
      }
      return hit;
    },

    /** Posição exata e autor. Com sequência, sorteia uma foto qualquer dela (mais variedade por rua). */
    async resolve(img: MlyImage, rng: () => number = Math.random): Promise<MlyImage | null> {
      let id = img.id;
      if (img.sequence) {
        const ids = await imagesOf(img.sequence);
        if (ids.length) id = ids[Math.floor(rng() * ids.length)];
      }
      const res = await fetchWithRetry(`${GRAPH_URL}/${id}?fields=${DETAIL_FIELDS}&access_token=${auth}`);
      return parseImageDetails((await res.json()) as RawImage);
    },
  };
}
