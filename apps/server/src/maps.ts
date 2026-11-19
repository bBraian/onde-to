import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { MAP_CATALOG, TEST_MAP_ID, type GameMap, type StreetProvider } from '@onde-to/shared';

const require = createRequire(import.meta.url);
const cache = new Map<string, GameMap>();

/** Mapas do Mapillary ficam em maps/<id>.json; os do Google em maps/google/<id>.json. O de teste serve aos dois. */
function mapPath(id: string, provider: StreetProvider = 'mapillary'): string | null {
  const sub = provider === 'google' && id !== TEST_MAP_ID ? 'google/' : '';
  try {
    return require.resolve(`@onde-to/shared/maps/${sub}${id}.json`);
  } catch {
    return null;
  }
}

/** Lê packages/shared/maps/<id>.json (com cache). */
export function loadMapServer(id: string, provider: StreetProvider = 'mapillary'): GameMap {
  const key = `${provider}/${id}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const path = mapPath(id, provider);
  if (!path) throw new Error(`mapa não encontrado: ${id}`);
  const map = JSON.parse(readFileSync(path, 'utf8')) as GameMap;
  cache.set(key, map);
  return map;
}

/** Mapas do catálogo cujo arquivo existe; inclui o mapa de teste quando habilitado. */
export function availableMapIds(enableTestMap: boolean, provider: StreetProvider = 'mapillary'): string[] {
  const ids = MAP_CATALOG.map((m) => m.id).filter((id) => {
    const p = mapPath(id, provider);
    return p !== null && existsSync(p);
  });
  return enableTestMap ? [...ids, TEST_MAP_ID] : ids;
}
