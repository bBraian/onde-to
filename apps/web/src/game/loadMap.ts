import { MAP_CATALOG, TEST_MAP_ID, type GameMap } from '@onde-to/shared';
import { config } from '../lib/config';

// Só entram no bundle os mapas que já foram gerados pelo script build-maps.
const files = import.meta.glob<{ default: GameMap }>('../../../../packages/shared/maps/*.json');

const loaders: Record<string, () => Promise<{ default: GameMap }>> = {};
for (const [path, load] of Object.entries(files)) {
  const id = path.split('/').pop()!.replace(/\.json$/, '');
  loaders[id] = load;
}

export function availableMaps(): { id: string; nome: string }[] {
  const list = MAP_CATALOG.filter((m) => m.id in loaders);
  if (config.enableTestMap && TEST_MAP_ID in loaders) list.push({ id: TEST_MAP_ID, nome: 'Teste' });
  return list;
}

export async function loadMap(id: string): Promise<GameMap> {
  const load = loaders[id];
  if (!load || (id === TEST_MAP_ID && !config.enableTestMap)) throw new Error(`mapa indisponível: ${id}`);
  return (await load()).default;
}

export function mapName(id: string): string {
  return MAP_CATALOG.find((m) => m.id === id)?.nome ?? (id === TEST_MAP_ID ? 'Teste' : id);
}
