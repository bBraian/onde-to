import { mulberry32, type GameMap } from '@onde-to/shared';
import testMapJson from '@onde-to/shared/maps/teste.json';
import { Room } from '../src/Room';

export const testMap = testMapJson as GameMap;

export function room(onChange: (r: Room) => void = () => {}): Room {
  return new Room('ABCD', { loadMap: () => testMap, allowedMapIds: ['teste', 'brasil'], rng: mulberry32(1), onChange });
}

export function join(r: Room, nick: string): string {
  const res = r.addPlayer(`s-${nick}`, nick);
  if ('error' in res) throw new Error(res.error);
  return res.playerId;
}

/** Local certo da rodada atual, lido do mapa de teste pelo imageId. */
export function answerOf(r: Room) {
  const id = r.view().round!.imageId;
  return testMap.pontos.find((p) => p.imageId === id)!;
}

export const far = { lat: 60, lng: 100 };
