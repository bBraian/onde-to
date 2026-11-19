import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import turfArea from '@turf/area';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { WORLD_SIZE_KM, type LatLng } from '@onde-to/shared';
import type { MapSpec, Region } from './build';
import { allocateTargets, randomInDisk } from './sample';

const here = dirname(fileURLToPath(import.meta.url));
const CACHE = join(here, '..', '.cache');

const IBGE_UF =
  'https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR?intrarregiao=UF&formato=application/vnd.geo+json&qualidade=minima';
const NE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson';
const NE_COUNTRIES = `${NE}/ne_110m_admin_0_countries.geojson`;
const NE_PLACES = `${NE}/ne_110m_populated_places_simple.geojson`;

const UF_BY_CODE: Record<string, string> = {
  '11': 'RO', '12': 'AC', '13': 'AM', '14': 'RR', '15': 'PA', '16': 'AP', '17': 'TO', '21': 'MA', '22': 'PI',
  '23': 'CE', '24': 'RN', '25': 'PB', '26': 'PE', '27': 'AL', '28': 'SE', '29': 'BA', '31': 'MG', '32': 'ES',
  '33': 'RJ', '35': 'SP', '41': 'PR', '42': 'SC', '43': 'RS', '50': 'MS', '51': 'MT', '52': 'GO', '53': 'DF',
};

type Feature = {
  type: 'Feature';
  properties: Record<string, any>;
  geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: any };
};

async function cachedJson(url: string, file: string): Promise<any> {
  const path = join(CACHE, file);
  if (existsSync(path)) return JSON.parse(readFileSync(path, 'utf8'));
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${url}: HTTP ${res.status}`);
  const text = await res.text();
  mkdirSync(CACHE, { recursive: true });
  writeFileSync(path, text);
  return JSON.parse(text);
}

function featureBBox(f: Feature): [number, number, number, number] {
  const polys: number[][][][] = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  let [minX, minY, maxX, maxY] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const poly of polys)
    for (const [x, y] of poly[0]) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  return [minX, minY, maxX, maxY];
}

/** Sorteia um ponto dentro do polígono (rejeição dentro do bbox). */
function polygonSampler(f: Feature): (rng: () => number) => LatLng {
  const [minX, minY, maxX, maxY] = featureBBox(f);
  return (rng) => {
    for (let i = 0; i < 1000; i++) {
      const lng = minX + rng() * (maxX - minX);
      const lat = minY + rng() * (maxY - minY);
      if (booleanPointInPolygon([lng, lat], f as any)) return { lat, lng };
    }
    return { lat: (minY + maxY) / 2, lng: (minX + maxX) / 2 };
  };
}

function areaRegions(features: Feature[], names: string[], total: number, opts: { min: number; cap?: number }): Region[] {
  const targets = allocateTargets(features.map((f) => turfArea(f as any)), total, opts);
  return features.map((f, i) => ({
    name: names[i],
    target: targets[i],
    sample: polygonSampler(f),
    contains: (p: LatLng) => booleanPointInPolygon([p.lng, p.lat], f as any),
  }));
}

/** Nome do país em português (Natural Earth NAME_PT), com o nome em inglês como reserva. */
export function countryName(props: Record<string, any>): string {
  return props.NAME_PT || props.NAME;
}

/** Regiões do mapa Mundo: um país por região, sem a Antártida, alvo pela área. */
export function countryRegions(countriesFc: { features: any[] }, total: number, opts: { min: number; cap?: number }): Region[] {
  const features = (countriesFc.features as Feature[]).filter((f) => f.properties.NAME !== 'Antarctica');
  return areaRegions(features, features.map((f) => countryName(f.properties)), total, opts);
}

/** Capitais nacionais do Natural Earth, com o país em português: "Berlin (Alemanha)". */
export function capitalCenters(placesFc: { features: any[] }, countriesFc: { features: any[] }): { name: string; lat: number; lng: number }[] {
  const ptByA3 = new Map<string, string>(countriesFc.features.map((f) => [f.properties.ADM0_A3, countryName(f.properties)]));
  return placesFc.features
    .filter((f) => f.properties.featurecla === 'Admin-0 capital')
    .map((f) => ({
      name: `${f.properties.name} (${ptByA3.get(f.properties.adm0_a3) ?? f.properties.adm0name})`,
      lat: f.properties.latitude,
      lng: f.properties.longitude,
    }));
}

/** As capitais estão espalhadas pelo planeta (cruzando o antimeridiano): o tamanho é o do mapa-múndi. */
export function capitaisMundoSpec(placesFc: { features: any[] }, countriesFc: { features: any[] }): MapSpec {
  return {
    id: 'capitais-mundo',
    nome: 'Capitais do Mundo',
    minKm: 0.5,
    fixedSizeKm: WORLD_SIZE_KM,
    regions: diskRegions(capitalCenters(placesFc, countriesFc), 3, 10),
  };
}

function diskRegions(centers: { name: string; lat: number; lng: number }[], perCenter: number, radiusKm: number): Region[] {
  return centers.map((c) => ({ name: c.name, target: perCenter, sample: (rng) => randomInDisk(c, radiusKm, rng) }));
}

export const MAP_IDS = ['brasil', 'capitais-br', 'capitais-mundo', 'mundo'] as const;

export async function loadSpec(mapId: string): Promise<MapSpec> {
  switch (mapId) {
    case 'brasil': {
      const fc = await cachedJson(IBGE_UF, 'ibge-uf.json');
      const features: Feature[] = fc.features;
      const names = features.map((f) => UF_BY_CODE[String(f.properties.codarea)] ?? String(f.properties.codarea));
      return { id: 'brasil', nome: 'Brasil', minKm: 5, regions: areaRegions(features, names, 500, { min: 8 }) };
    }
    case 'capitais-br': {
      const caps: { nome: string; uf: string; lat: number; lng: number }[] = JSON.parse(
        readFileSync(join(here, '..', 'data', 'capitais-br.json'), 'utf8'),
      );
      const centers = caps.map((c) => ({ name: `${c.nome} (${c.uf})`, lat: c.lat, lng: c.lng }));
      return { id: 'capitais-br', nome: 'Capitais do Brasil', minKm: 0.5, regions: diskRegions(centers, 15, 10) };
    }
    case 'capitais-mundo': {
      const places = await cachedJson(NE_PLACES, 'ne-places.json');
      const countries = await cachedJson(NE_COUNTRIES, 'ne-countries.json');
      return capitaisMundoSpec(places, countries);
    }
    case 'mundo': {
      const fc = await cachedJson(NE_COUNTRIES, 'ne-countries.json');
      return {
        id: 'mundo',
        nome: 'Mundo',
        minKm: 20,
        fixedSizeKm: WORLD_SIZE_KM,
        regions: countryRegions(fc, 1000, { min: 1, cap: 40 }),
      };
    }
    default:
      throw new Error(`mapa desconhecido: ${mapId}`);
  }
}
