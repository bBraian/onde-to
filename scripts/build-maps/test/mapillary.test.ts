import { parseImages, imagesUrl } from '../src/mapillary';

test('parseImages usa computed_geometry e cai para geometry', () => {
  const r = parseImages({
    data: [
      { id: '1', computed_geometry: { type: 'Point', coordinates: [-46.6, -23.5] }, geometry: { type: 'Point', coordinates: [0, 0] }, quality_score: 0.8, creator: { username: 'ana', id: '9' } },
      { id: '2', geometry: { type: 'Point', coordinates: [-43.1, -22.9] } },
      { id: '3' },
    ],
  });
  expect(r).toEqual([
    { id: '1', lat: -23.5, lng: -46.6, quality: 0.8, creator: 'ana' },
    { id: '2', lat: -22.9, lng: -43.1, quality: null, creator: null },
  ]);
});

test('imagesUrl monta a busca de panoramas', () => {
  const u = new URL(imagesUrl([-46.7, -23.6, -46.6, -23.5], 'TKN'));
  expect(u.origin + u.pathname).toBe('https://graph.mapillary.com/images');
  expect(u.searchParams.get('bbox')).toBe('-46.7,-23.6,-46.6,-23.5');
  expect(u.searchParams.get('is_pano')).toBe('true');
  expect(u.searchParams.get('fields')).toBe('id,computed_geometry,geometry,quality_score,creator');
  expect(u.searchParams.get('access_token')).toBe('TKN');
});
