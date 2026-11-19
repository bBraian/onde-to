import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

const created: FakePano[] = [];
class FakePano {
  listeners: Record<string, () => void> = {};
  status = 'OK';
  pano = '';
  options: Record<string, unknown>;
  attached: boolean;
  constructor(el: HTMLElement, opts: Record<string, unknown>) {
    this.attached = el.isConnected;
    this.options = opts;
    this.pano = String(opts.pano ?? '');
    created.push(this);
  }
  addListener(ev: string, fn: () => void) { this.listeners[ev] = fn; return { remove() {} }; }
  setPano(id: string) { this.pano = id; }
  setPov() {}
  setOptions(o: Record<string, unknown>) { Object.assign(this.options, o); }
  getStatus() { return this.status; }
}
vi.mock('@googlemaps/js-api-loader', () => ({
  setOptions: vi.fn(),
  importLibrary: vi.fn(async () => ({ StreetViewPanorama: FakePano })),
}));
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let el: HTMLDivElement;
let root: Root;
beforeEach(() => {
  vi.resetModules();
  created.length = 0;
  el = document.createElement('div');
  document.body.appendChild(el);
  root = createRoot(el);
});
afterEach(() => { act(() => root.unmount()); el.remove(); vi.unstubAllEnvs(); });
const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });

test('opções do panorama por regra de movimento', async () => {
  const { googlePanoramaOptions } = await import('../src/components/viewerOptions');
  expect(googlePanoramaOptions('nmpz')).toMatchObject({ scrollwheel: false, zoomControl: false, linksControl: false, clickToGo: false, addressControl: false, showRoadLabels: false });
  expect(googlePanoramaOptions('move')).toMatchObject({ linksControl: true, clickToGo: true, addressControl: false });
  expect(googlePanoramaOptions('no-move')).toMatchObject({ linksControl: false, clickToGo: false, scrollwheel: true });
});

test('sem chave mostra o aviso', async () => {
  vi.stubEnv('VITE_GOOGLE_MAPS_KEY', '');
  const { GoogleViewer } = await import('../src/components/street/GoogleViewer');
  await act(async () => { root.render(<GoogleViewer panoId="P1" movement="move" />); });
  expect(el.querySelector('[role="alert"]')?.textContent).toContain('Falta configurar a chave do Google');
});

test('reaproveita um panorama só entre montagens e troca o lugar com setPano', async () => {
  vi.stubEnv('VITE_GOOGLE_MAPS_KEY', 'K');
  const { GoogleViewer } = await import('../src/components/street/GoogleViewer');
  await act(async () => { root.render(<GoogleViewer key="r1" panoId="P1" movement="move" />); });
  await flush();
  await act(async () => { root.render(<GoogleViewer key="r2" panoId="P2" movement="move" />); });
  await flush();
  expect(created).toHaveLength(1);
  expect(created[0].pano).toBe('P2');
  expect(created[0].attached).toBe(true); // construído já dentro da página (senão nasce com 0×0)
});

test('status diferente de OK mostra "Imagem indisponível" e chama onError uma vez', async () => {
  vi.stubEnv('VITE_GOOGLE_MAPS_KEY', 'K');
  const { GoogleViewer } = await import('../src/components/street/GoogleViewer');
  const onError = vi.fn();
  await act(async () => { root.render(<GoogleViewer panoId="P1" movement="nmpz" onError={onError} />); });
  await flush();
  expect(el.querySelector('.street-lock')).not.toBeNull();
  created[0].status = 'ZERO_RESULTS';
  await act(async () => { created[0].listeners.status_changed(); });
  expect(onError).toHaveBeenCalledTimes(1);
  expect(el.textContent).toContain('Imagem indisponível');
});

test('StreetViewer usa o Google quando configurado', async () => {
  vi.stubEnv('VITE_STREET_PROVIDER', 'google');
  vi.stubEnv('VITE_GOOGLE_MAPS_KEY', '');
  vi.stubEnv('VITE_FAKE_VIEWER', '');
  const { StreetViewer } = await import('../src/components/StreetViewer');
  await act(async () => { root.render(<StreetViewer imageId="P1" movement="move" />); });
  expect(el.textContent).toContain('Falta configurar a chave do Google');
});
