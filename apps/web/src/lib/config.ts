// Único ponto que lê as variáveis de ambiente do Vite. Leitura preguiçosa para que testes possam trocá-las.
const vars = () => import.meta.env;

export const config = {
  get mapillaryToken(): string {
    return vars().VITE_MAPILLARY_TOKEN ?? '';
  },
  get serverUrl(): string {
    return vars().VITE_SERVER_URL ?? 'http://localhost:3001';
  },
  get fakeViewer(): boolean {
    return vars().VITE_FAKE_VIEWER === '1';
  },
  get enableTestMap(): boolean {
    return vars().VITE_ENABLE_TEST_MAP === '1';
  },
};
