import type { LatLng } from '@onde-to/shared';
import { FatalSearchError, fetchWithRetry } from './http';
import type { MlyImage } from './sample';

// Street View Static API — consulta de metadados (grátis e sem limite de uso).
const METADATA_URL = 'https://maps.googleapis.com/maps/api/streetview/metadata';

export function metadataUrl(p: LatLng, radiusM: number, key: string): string {
  const u = new URL(METADATA_URL);
  u.searchParams.set('location', `${p.lat},${p.lng}`);
  u.searchParams.set('radius', String(radiusM));
  u.searchParams.set('source', 'outdoor');
  u.searchParams.set('key', key);
  return u.toString();
}

interface Metadata {
  status: string;
  pano_id?: string;
  location?: { lat: number; lng: number };
  copyright?: string;
  error_message?: string;
}

/** Só panoramas do próprio Google (o copyright diz "Google"): fotos 360° enviadas por usuários ficam de fora. */
export function parseMetadata(m: Metadata): MlyImage | null {
  if (m.status !== 'OK' || !m.pano_id || !m.location || !/google/i.test(m.copyright ?? '')) return null;
  return { id: m.pano_id, lat: m.location.lat, lng: m.location.lng, quality: null, creator: null };
}

/** Fonte de candidatos do Google: um panorama (ou nenhum) por ponto sorteado; a posição já é a exata. */
export function createGoogleSource(key: string, radiusM = 1000) {
  return {
    async candidates(p: LatLng): Promise<MlyImage[]> {
      const res = await fetchWithRetry(metadataUrl(p, radiusM, key));
      const m = (await res.json()) as Metadata;
      if (m.status === 'REQUEST_DENIED') throw new FatalSearchError(`Google: ${m.error_message ?? 'REQUEST_DENIED'}`);
      if (m.status === 'OVER_QUERY_LIMIT' || m.status === 'UNKNOWN_ERROR') throw new Error(`Google: ${m.status}`);
      const img = parseMetadata(m);
      return img ? [img] : [];
    },
  };
}
