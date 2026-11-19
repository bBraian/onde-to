import { availableMaps, loadMap } from '../src/game/loadMap';

afterEach(() => { vi.unstubAllEnvs(); });

test('availableMaps lista só mapas cujo arquivo existe, sem o de teste por padrão', () => {
  const ids = availableMaps().map((m) => m.id);
  expect(ids).not.toContain('teste');
  for (const id of ids) expect(['brasil', 'capitais-br', 'capitais-mundo', 'mundo']).toContain(id);
});

test('mapa de teste aparece com VITE_ENABLE_TEST_MAP=1 e carrega', async () => {
  vi.stubEnv('VITE_ENABLE_TEST_MAP', '1');
  expect(availableMaps().map((m) => m.id)).toContain('teste');
  const m = await loadMap('teste');
  expect(m.pontos).toHaveLength(10);
});

test('loadMap de mapa inexistente rejeita', async () => {
  await expect(loadMap('nao-existe')).rejects.toThrow();
});

test('com provedor google e sem mapas do Google só sobra o de teste', async () => {
  vi.stubEnv('VITE_STREET_PROVIDER', 'google');
  vi.stubEnv('VITE_ENABLE_TEST_MAP', '1');
  expect(availableMaps().map((m) => m.id)).toEqual(['teste']);
  await expect(loadMap('brasil')).rejects.toThrow();
});
