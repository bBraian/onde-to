import { MAP_CATALOG, TEST_MAP_ID, type GameMap } from '@onde-to/shared';
import { config } from '../lib/config';

// Só entram no bundle os mapas que já foram gerados pelo script build-maps (Mapillary na raiz, Google em google/).
const files = import.meta.glob<{ default: GameMap }>(['../../../../packages/shared/maps/*.json', '../../../../packages/shared/maps/google/*.json']);

type Loader = () => Promise<{ default: GameMap }>;
const byProvider: Record<'mapillary' | 'google', Record<string, Loader>> = { mapillary: {}, google: {} };
for (const [path, load] of Object.entries(files)) {
  const id = path.split('/').pop()!.replace(/\.json$/, '');
  byProvider[path.includes('/maps/google/') ? 'google' : 'mapillary'][id] = load;
}

/** Mapas do provedor configurado; o de teste (fotos falsas) serve para qualquer provedor. */
function loadersNow(): Record<string, Loader> {
  const own = byProvider[config.streetProvider];
  const test = byProvider.mapillary[TEST_MAP_ID];
  return test ? { ...own, [TEST_MAP_ID]: test } : own;
}

export function availableMaps(): { id: string; nome: string }[] {
  const loaders = loadersNow();
  const list = MAP_CATALOG.filter((m) => m.id in loaders);
  if (config.enableTestMap && TEST_MAP_ID in loaders) list.push({ id: TEST_MAP_ID, nome: 'Teste' });
  return list;
}

export async function loadMap(id: string): Promise<GameMap> {
  const load = loadersNow()[id];
  if (!load || (id === TEST_MAP_ID && !config.enableTestMap)) throw new Error(`mapa indisponível: ${id}`);
  return (await load()).default;
}

export function mapName(id: string): string {
  return MAP_CATALOG.find((m) => m.id === id)?.nome ?? (id === TEST_MAP_ID ? 'Teste' : id);
}
