import { mulberry32, type GameMap } from '@onde-to/shared';
import { trainingReducer, type TrainingState } from '../src/game/training';

const map: GameMap = {
  id: 't', nome: 'T', tamanhoKm: 4000,
  pontos: [
    { imageId: 'a', lat: -23.55, lng: -46.63, regiao: 'SP' },
    { imageId: 'b', lat: -22.9, lng: -43.17, regiao: 'RJ' },
    { imageId: 'c', lat: -30.03, lng: -51.22, regiao: 'RS' },
  ],
};

const start = (roundTimeSec: number | null, rounds = 2): TrainingState =>
  trainingReducer({ phase: 'setup' }, { type: 'start', settings: { mapId: 't', rounds, roundTimeSec, movement: 'move' }, map, rng: mulberry32(1), now: 0 });

test('fluxo de 2 rodadas soma pontos e termina em summary', () => {
  let s = start(60);
  expect(s.phase).toBe('round');
  if (s.phase !== 'round') throw new Error();
  expect(s.deadline).toBe(60_000);
  s = trainingReducer(s, { type: 'guess', guess: s.point });
  expect(s.phase).toBe('result');
  if (s.phase !== 'result') throw new Error();
  expect(s.results[0].score).toBe(5000);
  s = trainingReducer(s, { type: 'next', now: 1 });
  expect(s).toMatchObject({ phase: 'round', round: 2 });
  s = trainingReducer(s, { type: 'guess', guess: null });
  s = trainingReducer(s, { type: 'next', now: 2 });
  expect(s).toMatchObject({ phase: 'summary', total: 5000 });
});

test('não repete ponto entre rodadas', () => {
  let s = start(null, 3);
  const seen: string[] = [];
  for (let i = 0; i < 3; i++) {
    if (s.phase !== 'round') throw new Error();
    seen.push(s.point.imageId);
    s = trainingReducer(trainingReducer(s, { type: 'guess', guess: null }), { type: 'next', now: i });
  }
  expect(new Set(seen).size).toBe(3);
});

test('skip troca o ponto sem gastar rodada', () => {
  let s = start(null);
  if (s.phase !== 'round') throw new Error();
  const before = s.point.imageId;
  s = trainingReducer(s, { type: 'skip', now: 5 });
  if (s.phase !== 'round') throw new Error();
  expect(s.round).toBe(1);
  expect(s.point.imageId).not.toBe(before);
  expect(s.deadline).toBeNull();
});

test('rodadas além do tamanho do mapa encerram no resumo', () => {
  let s = start(null, 5);
  for (let i = 0; i < 3; i++) s = trainingReducer(trainingReducer(s, { type: 'guess', guess: null }), { type: 'next', now: i });
  expect(s.phase).toBe('summary');
});

test('ação fora de fase é ignorada', () => {
  const s = start(60);
  expect(trainingReducer(s, { type: 'next', now: 1 })).toBe(s);
});
