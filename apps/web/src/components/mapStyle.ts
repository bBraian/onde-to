import type { LatLng } from '@onde-to/shared';

export const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

export interface MapView {
  center: [number, number];
  zoom: number;
}

/** Enquadramento inicial do mapa de palpite para cada mapa do jogo. */
export function initialView(mapId: string): MapView {
  if (mapId === 'brasil' || mapId === 'capitais-br' || mapId === 'teste') return { center: [-53, -14], zoom: 2.6 };
  return { center: [10, 20], zoom: 0.6 };
}

export const toLngLat = (p: LatLng): [number, number] => [p.lng, p.lat];
