import { recordKey, saveRecord } from '../src/lib/records';
import { remainingSec } from '../src/lib/clock';

beforeEach(() => localStorage.clear());

test('saveRecord guarda o melhor total', () => {
  expect(saveRecord('k', 100)).toEqual({ best: 100, isNew: true });
  expect(saveRecord('k', 50)).toEqual({ best: 100, isNew: false });
  expect(saveRecord('k', 150)).toEqual({ best: 150, isNew: true });
});

test('recordKey combina mapa, rodadas, tempo e movimento', () => {
  expect(recordKey({ mapId: 'brasil', rounds: 5, roundTimeSec: null, movement: 'nmpz' })).toBe('brasil|5|inf|nmpz');
  expect(recordKey({ mapId: 'mundo', rounds: 3, roundTimeSec: 60, movement: 'move' })).toBe('mundo|3|60|move');
});

test('remainingSec usa o deadline e a diferença de relógio', () => {
  expect(remainingSec(10_000, 0)).toBe(10);
  expect(remainingSec(10_000, 0, 3_000)).toBe(7);
  expect(remainingSec(10_000, 20_000)).toBe(0);
  expect(remainingSec(10_000, 9_001)).toBe(1);
});
