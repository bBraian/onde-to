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
