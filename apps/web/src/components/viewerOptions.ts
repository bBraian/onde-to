import type { Movement } from '@onde-to/shared';

/** Opções de componentes do MapillaryJS para cada regra de movimento. */
export function viewerComponents(movement: Movement): Record<string, unknown> {
  const base = { attribution: false, cover: false };
  switch (movement) {
    case 'move':
      return { ...base, sequence: { visible: true, playing: false }, direction: true, keyboard: true, pointer: true, zoom: true };
    case 'no-move':
      return { ...base, sequence: false, direction: false, keyboard: false, pointer: true, zoom: true };
    case 'nmpz':
      return { ...base, sequence: false, direction: false, keyboard: false, pointer: false, zoom: false };
  }
}

/** Opções do StreetViewPanorama do Google para cada regra de movimento (endereço e nomes de rua escondidos). */
export function googlePanoramaOptions(movement: Movement): google.maps.StreetViewPanoramaOptions {
  const base = { addressControl: false, showRoadLabels: false, fullscreenControl: false, motionTracking: false, motionTrackingControl: false };
  switch (movement) {
    case 'move':
      return { ...base, linksControl: true, clickToGo: true, panControl: true, zoomControl: true, scrollwheel: true };
    case 'no-move':
      return { ...base, linksControl: false, clickToGo: false, panControl: true, zoomControl: true, scrollwheel: true };
    case 'nmpz':
      return { ...base, linksControl: false, clickToGo: false, panControl: false, zoomControl: false, scrollwheel: false };
  }
}
