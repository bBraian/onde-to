import { createGoogleSource, metadataUrl, parseMetadata } from '../src/google';
import { FatalSearchError } from '../src/http';

test('parseMetadata aceita só panorama do Google com status OK', () => {
  expect(parseMetadata({ status: 'OK', pano_id: 'P', location: { lat: 1, lng: 2 }, copyright: '© Google' }))
    .toEqual({ id: 'P', lat: 1, lng: 2, quality: null, creator: null });
  expect(parseMetadata({ status: 'OK', pano_id: 'P', location: { lat: 1, lng: 2 }, copyright: '© Fulano de Tal' })).toBeNull();
  expect(parseMetadata({ status: 'ZERO_RESULTS' })).toBeNull();
});

test('metadataUrl pede só panoramas externos dentro do raio', () => {
  const u = new URL(metadataUrl({ lat: -23.5, lng: -46.6 }, 1000, 'K'));
  expect(u.origin + u.pathname).toBe('https://maps.googleapis.com/maps/api/streetview/metadata');
  expect(u.searchParams.get('location')).toBe('-23.5,-46.6');
  expect(u.searchParams.get('radius')).toBe('1000');
  expect(u.searchParams.get('source')).toBe('outdoor');
  expect(u.searchParams.get('key')).toBe('K');
});

describe('createGoogleSource', () => {
  afterEach(() => vi.unstubAllGlobals());

  test('devolve o panorama encontrado', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ status: 'OK', pano_id: 'X', location: { lat: 3, lng: 4 }, copyright: '© 2025 Google' }), { status: 200 })));
    expect(await createGoogleSource('K').candidates({ lat: 0, lng: 0 })).toEqual([{ id: 'X', lat: 3, lng: 4, quality: null, creator: null }]);
  });

  test('REQUEST_DENIED é fatal (chave inválida)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ status: 'REQUEST_DENIED', error_message: 'bad key' }), { status: 200 })));
    await expect(createGoogleSource('K').candidates({ lat: 0, lng: 0 })).rejects.toBeInstanceOf(FatalSearchError);
  });

  test('sem cobertura devolve lista vazia', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ status: 'ZERO_RESULTS' }), { status: 200 })));
    expect(await createGoogleSource('K').candidates({ lat: 0, lng: 0 })).toEqual([]);
  });
});
