import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mulberry32 } from '@onde-to/shared';
import { buildMap, isPublishable, MIN_POINTS } from './build';
import { searchPanos } from './mapillary';
import { loadSpec, MAP_IDS } from './regions';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'packages', 'shared', 'maps');

async function main() {
  const token = process.env.MAPILLARY_TOKEN;
  if (!token) {
    console.error('Defina MAPILLARY_TOKEN (client token de mapillary.com/dashboard/developers).');
    process.exit(1);
  }
  const ids = process.argv.slice(2).length ? process.argv.slice(2) : [...MAP_IDS];
  let failed = false;
  for (const id of ids) {
    const spec = await loadSpec(id);
    const target = spec.regions.reduce((s, r) => s + r.target, 0);
    console.log(`\n▶ ${spec.nome}: alvo ${target} pontos em ${spec.regions.length} regiões`);
    const { map, report } = await buildMap(spec, (bbox) => searchPanos(bbox, token), mulberry32(Date.now()), 20, 8);
    const publishable = isPublishable(map);
    if (publishable) writeFileSync(join(OUT_DIR, `${id}.json`), JSON.stringify(map) + '\n');
    const short = Object.entries(report).filter(([, r]) => r.got < r.target);
    console.log(`  ${map.pontos.length}/${target} pontos, tamanho ${map.tamanhoKm} km${publishable ? ` → maps/${id}.json` : ' (não gravado)'}`);
    if (short.length) {
      console.log(`  Abaixo do alvo (${short.length} regiões):`);
      for (const [name, r] of short) console.log(`    ${name}: ${r.got}/${r.target}`);
    }
    if (!publishable) {
      console.error(`  ✖ ${id} ficou com menos de ${MIN_POINTS} pontos e não foi gravado.`);
      failed = true;
    }
  }
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
