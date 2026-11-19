import type { LatLng } from './geo';

export interface MapPoint extends LatLng {
  imageId: string;
  regiao: string;
  autor?: string;
}

export type StreetProvider = 'mapillary' | 'google';

export interface GameMap {
  id: string;
  nome: string;
  tamanhoKm: number;
  pontos: MapPoint[];
  /** Provedor das imagens (ausente = mapillary). `imageId` é o id do lugar nesse provedor. */
  provider?: StreetProvider;
}

export const MAP_CATALOG: { id: string; nome: string }[] = [
  { id: 'brasil', nome: 'Brasil' },
  { id: 'capitais-br', nome: 'Capitais do Brasil' },
  { id: 'capitais-mundo', nome: 'Capitais do Mundo' },
  { id: 'mundo', nome: 'Mundo' },
];

export const TEST_MAP_ID = 'teste';

/** PRNG pequeno e determinístico. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Baralho embaralhado (Fisher–Yates) que entrega cada ponto uma única vez. */
export function createDeck(points: MapPoint[], rng: () => number): { draw(): MapPoint | null; remaining(): number } {
  const cards = points.slice();
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return {
    draw: () => cards.pop() ?? null,
    remaining: () => cards.length,
  };
}
