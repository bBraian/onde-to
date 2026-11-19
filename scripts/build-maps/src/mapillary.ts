import type { BBox, MlyImage } from './sample';

const FIELDS = 'id,computed_geometry,geometry,quality_score,creator';

export function imagesUrl(bbox: BBox, token: string): string {
  const u = new URL('https://graph.mapillary.com/images');
  u.searchParams.set('access_token', token);
  u.searchParams.set('bbox', bbox.join(','));
  u.searchParams.set('is_pano', 'true');
  u.searchParams.set('limit', '200');
  u.searchParams.set('fields', FIELDS);
  return u.toString();
}

interface RawImage {
  id: string;
  computed_geometry?: { type?: string; coordinates: [number, number] };
  geometry?: { type?: string; coordinates: [number, number] };
  quality_score?: number | null;
  creator?: { username?: string; id?: string } | null;
}

export function parseImages(json: { data?: RawImage[] }): MlyImage[] {
  const out: MlyImage[] = [];
  for (const r of json.data ?? []) {
    const coords = r.computed_geometry?.coordinates ?? r.geometry?.coordinates;
    if (!coords) continue;
    out.push({ id: r.id, lat: coords[1], lng: coords[0], quality: r.quality_score ?? null, creator: r.creator?.username ?? null });
  }
  return out;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Erro que não adianta repetir nem pular (token inválido ou sem permissão): aborta a geração do mapa. */
export class FatalSearchError extends Error {
  name = 'FatalSearchError';
}

const MAX_RETRIES = 3;

/**
 * Busca panoramas num bbox. Repete até 3 vezes em erro de rede, HTTP 429 e 5xx, com espera crescente.
 * 401/403 lançam FatalSearchError; outros erros lançam Error comum (quem chama pode pular esse bbox).
 */
export async function searchPanos(bbox: BBox, token: string): Promise<MlyImage[]> {
  for (let attempt = 0; ; attempt++) {
    let res: Response;
    try {
      res = await fetch(imagesUrl(bbox, token));
    } catch (err) {
      if (attempt >= MAX_RETRIES) throw err;
      await sleep(1000 * 2 ** attempt);
      continue;
    }
    if (res.ok) return parseImages((await res.json()) as { data?: RawImage[] });
    if (res.status === 401 || res.status === 403) throw new FatalSearchError(`Mapillary HTTP ${res.status}: ${await res.text()}`);
    const retriable = res.status === 429 || res.status >= 500;
    if (!retriable || attempt >= MAX_RETRIES) throw new Error(`Mapillary HTTP ${res.status}: ${await res.text()}`);
    await sleep(1000 * 2 ** attempt);
  }
}
