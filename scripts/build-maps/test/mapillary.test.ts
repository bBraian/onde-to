import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  createTileSource, fetchWithRetry, FatalSearchError, parseImageDetails, parseSequenceTile, tileBounds, tileFor,
} from '../src/mapillary';

const fixture = readFileSync(join(__dirname, 'fixtures', 'tile-12-1545-2293.pbf')); // Tiradentes (MG), dados © Mapillary

test('tileFor acha o tile XYZ de um ponto', () => {
  expect(tileFor({ lat: -21.11, lng: -44.177 }, 12)).toEqual([1545, 2293]);
});

test('parseSequenceTile lista só sequências 360°, sem repetir imagem, dentro do tile', () => {
  const imgs = parseSequenceTile(fixture, 12, 1545, 2293);
  expect(imgs.length).toBeGreaterThan(50);
  expect(new Set(imgs.map((i) => i.id)).size).toBe(imgs.length);
  const [w, s, e, n] = tileBounds(12, 1545, 2293);
  for (const i of imgs) {
    expect(i.lng).toBeGreaterThanOrEqual(w - 0.05);
    expect(i.lng).toBeLessThanOrEqual(e + 0.05);
    expect(i.lat).toBeGreaterThanOrEqual(s - 0.05);
    expect(i.lat).toBeLessThanOrEqual(n + 0.05);
    expect(typeof i.id).toBe('string');
    expect(typeof i.sequence).toBe('string');
  }
});

test('parseSequenceTile de tile vazio devolve []', () => {
  expect(parseSequenceTile(new Uint8Array(), 12, 0, 0)).toEqual([]);
});

test('parseImageDetails usa computed_geometry, cai para geometry e lê o autor', () => {
  expect(parseImageDetails({ id: '1', computed_geometry: { coordinates: [-46.6, -23.5] }, quality_score: 0.8, creator: { username: 'ana' } }))
    .toEqual({ id: '1', lat: -23.5, lng: -46.6, quality: 0.8, creator: 'ana' });
  expect(parseImageDetails({ id: '2', geometry: { coordinates: [1, 2] } })).toEqual({ id: '2', lat: 2, lng: 1, quality: null, creator: null });
  expect(parseImageDetails({ id: '3' })).toBeNull();
});

describe('fetchWithRetry', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  test('repete depois de erro de rede', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const p = fetchWithRetry('https://x.test/');
    await vi.runAllTimersAsync();
    expect(await (await p).text()).toBe('ok');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test('401 lança FatalSearchError sem repetir', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('bad token', { status: 401 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(fetchWithRetry('https://x.test/')).rejects.toBeInstanceOf(FatalSearchError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

test('createTileSource busca cada tile uma vez só e resolve a posição exata', async () => {
  const fetchMock = vi.fn(async (url: string) =>
    url.includes('tiles.mapillary.com')
      ? new Response(fixture, { status: 200 })
      : new Response(JSON.stringify({ id: '9', computed_geometry: { coordinates: [-44.18, -21.11] }, creator: { username: 'bia' } }), { status: 200 }),
  );
  vi.stubGlobal('fetch', fetchMock);
  const src = createTileSource('T', 12);
  const a = await src.candidates({ lat: -21.11, lng: -44.177 });
  const b = await src.candidates({ lat: -21.105, lng: -44.17 });
  expect(a.length).toBeGreaterThan(0);
  expect(b).toBe(a);
  expect(fetchMock.mock.calls.filter(([u]) => String(u).includes('tiles.mapillary.com'))).toHaveLength(1);
  expect(await src.resolve(a[0])).toEqual({ id: '9', lat: -21.11, lng: -44.18, quality: null, creator: 'bia' });
  vi.unstubAllGlobals();
});

test('resolve de candidato com sequência sorteia uma foto da sequência', async () => {
  const fetchMock = vi.fn(async (url: string) => {
    if (url.includes('/image_ids?')) return new Response(JSON.stringify({ data: [{ id: '11' }, { id: '22' }, { id: '33' }] }), { status: 200 });
    const id = url.split('/').pop()!.split('?')[0];
    return new Response(JSON.stringify({ id, computed_geometry: { coordinates: [1, 2] } }), { status: 200 });
  });
  vi.stubGlobal('fetch', fetchMock);
  const src = createTileSource('T', 12);
  const got = await src.resolve({ id: 'rep', lat: 0, lng: 0, quality: 0.9, creator: null, sequence: 'S1' }, () => 0.5);
  expect(got).toEqual({ id: '22', lat: 2, lng: 1, quality: null, creator: null });
  await src.resolve({ id: 'rep', lat: 0, lng: 0, quality: 0.9, creator: null, sequence: 'S1' }, () => 0);
  expect(fetchMock.mock.calls.filter(([u]) => String(u).includes('/image_ids?'))).toHaveLength(1);
  vi.unstubAllGlobals();
});
