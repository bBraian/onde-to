import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { MAP_CATALOG, TEST_MAP_ID, type GameMap } from '@onde-to/shared';

const require = createRequire(import.meta.url);
const cache = new Map<string, GameMap>();

function mapPath(id: string): string | null {
  try {
    return require.resolve(`@onde-to/shared/maps/${id}.json`);
  } catch {
    return null;
  }
}

/** Lê packages/shared/maps/<id>.json (com cache). */
export function loadMapServer(id: string): GameMap {
  const hit = cache.get(id);
  if (hit) return hit;
  const path = mapPath(id);
  if (!path) throw new Error(`mapa não encontrado: ${id}`);
  const map = JSON.parse(readFileSync(path, 'utf8')) as GameMap;
  cache.set(id, map);
  return map;
}

/** Mapas do catálogo cujo arquivo existe; inclui o mapa de teste quando habilitado. */
export function availableMapIds(enableTestMap: boolean): string[] {
  const ids = MAP_CATALOG.map((m) => m.id).filter((id) => {
    const p = mapPath(id);
    return p !== null && existsSync(p);
  });
  return enableTestMap ? [...ids, TEST_MAP_ID] : ids;
}
