import { WORLD_SIZE_KM, mulberry32 } from '@onde-to/shared';
import { capitalCenters, capitaisMundoSpec, countryName, countryRegions } from '../src/regions';

const square = (x: number, y: number, s = 1) => ({
  type: 'Polygon' as const,
  coordinates: [[[x, y], [x + s, y], [x + s, y + s], [x, y + s], [x, y]]],
});
const countries = {
  features: [
    { type: 'Feature', properties: { NAME: 'Germany', NAME_PT: 'Alemanha', ADM0_A3: 'DEU' }, geometry: square(10, 50) },
    { type: 'Feature', properties: { NAME: 'Nowhere', ADM0_A3: 'NWH' }, geometry: square(30, 10) },
    { type: 'Feature', properties: { NAME: 'Antarctica', NAME_PT: 'Antártida', ADM0_A3: 'ATA' }, geometry: square(0, -80) },
  ],
};
const places = {
  features: [
    { properties: { featurecla: 'Admin-0 capital', name: 'Berlin', adm0name: 'Germany', adm0_a3: 'DEU', latitude: 52.5, longitude: 13.4 } },
    { properties: { featurecla: 'Populated place', name: 'Hamburg', adm0name: 'Germany', adm0_a3: 'DEU', latitude: 53.5, longitude: 10 } },
    { properties: { featurecla: 'Admin-0 capital', name: 'Xyz', adm0name: 'Somewhere', adm0_a3: 'SMW', latitude: 1, longitude: 2 } },
  ],
};

test('countryName usa o nome em português quando existe', () => {
  expect(countryName({ NAME: 'Germany', NAME_PT: 'Alemanha' })).toBe('Alemanha');
  expect(countryName({ NAME: 'Nowhere' })).toBe('Nowhere');
});

test('capitais do mundo: só capitais nacionais, país em português', () => {
  expect(capitalCenters(places, countries)).toEqual([
    { name: 'Berlin (Alemanha)', lat: 52.5, lng: 13.4 },
    { name: 'Xyz (Somewhere)', lat: 1, lng: 2 },
  ]);
});

test('capitais do mundo têm o tamanho do mapa-múndi', () => {
  expect(capitaisMundoSpec(places, countries).fixedSizeKm).toBe(WORLD_SIZE_KM);
});

test('regiões de país: nome em português, sem Antártida, e checam se o ponto está dentro', () => {
  const regions = countryRegions(countries, 10, { min: 1 });
  expect(regions.map((r) => r.name)).toEqual(['Alemanha', 'Nowhere']);
  const de = regions[0];
  expect(de.contains!({ lat: 50.5, lng: 10.5 })).toBe(true);
  expect(de.contains!({ lat: 40, lng: 10.5 })).toBe(false);
  const p = de.sample(mulberry32(1));
  expect(de.contains!(p)).toBe(true);
});

test('região de capital só aceita imagem perto da capital', () => {
  const r = capitaisMundoSpec(places, countries).regions[0];
  expect(r.contains!({ lat: 52.5, lng: 13.4 })).toBe(true);
  expect(r.contains!({ lat: 52.5, lng: 14.4 })).toBe(false); // ~68 km
});
