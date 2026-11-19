import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mulberry32, type StreetProvider } from '@onde-to/shared';
import { buildMap, isPublishable, MIN_POINTS } from './build';
import { createGoogleSource } from './google';
import { createTileSource } from './mapillary';
import { loadSpec, MAP_IDS } from './regions';

const MAPS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'packages', 'shared', 'maps');

/** Uso: pnpm build-maps [--provider mapillary|google] [mapId…] */
export function parseArgs(argv: string[]): { provider: StreetProvider; ids: string[] } {
  const ids: string[] = [];
  let provider: StreetProvider = 'mapillary';
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--provider') provider = argv[++i] === 'google' ? 'google' : 'mapillary';
    else ids.push(argv[i]);
  }
  return { provider, ids: ids.length ? ids : [...MAP_IDS] };
}

async function main() {
  const { provider, ids } = parseArgs(process.argv.slice(2));
  const secret = provider === 'google' ? process.env.GOOGLE_MAPS_KEY : process.env.MAPILLARY_TOKEN;
  if (!secret) {
    console.error(
      provider === 'google'
        ? 'Defina GOOGLE_MAPS_KEY (chave com a Street View Static API ativada).'
        : 'Defina MAPILLARY_TOKEN (client token de mapillary.com/dashboard/developers).',
    );
    process.exit(1);
  }
  const outDir = provider === 'google' ? join(MAPS_DIR, 'google') : MAPS_DIR;
  mkdirSync(outDir, { recursive: true });

  let failed = false;
  for (const id of ids) {
    const spec = await loadSpec(id);
    const target = spec.regions.reduce((s, r) => s + r.target, 0);
    console.log(`\n▶ ${spec.nome} (${provider}): alvo ${target} pontos em ${spec.regions.length} regiões`);
    const started = Date.now();
    const rng = mulberry32(Date.now());
    let result;
    if (provider === 'google') {
      const source = createGoogleSource(secret);
      result = await buildMap(spec, (p) => source.candidates(p), rng, 20, 8);
    } else {
      const source = createTileSource(secret, spec.tileZoom ?? 12);
      result = await buildMap(spec, (p) => source.candidates(p), rng, 20, 8, (img, r) => source.resolve(img, r));
    }
    const { map, report } = result;
    console.log(`  levou ${Math.round((Date.now() - started) / 1000)} s`);
    const publishable = isPublishable(map);
    const rel = `maps/${provider === 'google' ? 'google/' : ''}${id}.json`;
    if (publishable) writeFileSync(join(outDir, `${id}.json`), JSON.stringify({ ...map, provider }) + '\n');
    const short = Object.entries(report).filter(([, r]) => r.got < r.target);
    console.log(`  ${map.pontos.length}/${target} pontos, tamanho ${map.tamanhoKm} km${publishable ? ` → ${rel}` : ' (não gravado)'}`);
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

// Só roda quando executado como script (os testes importam parseArgs).
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
