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

/** Busca panoramas num bbox. Repete até 3 vezes em HTTP 429/5xx, com espera crescente. */
export async function searchPanos(bbox: BBox, token: string): Promise<MlyImage[]> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(imagesUrl(bbox, token));
    if (res.ok) return parseImages((await res.json()) as { data?: RawImage[] });
    const retriable = res.status === 429 || res.status >= 500;
    if (!retriable || attempt >= 3) throw new Error(`Mapillary HTTP ${res.status}: ${await res.text()}`);
    await sleep(1000 * 2 ** attempt);
  }
}
