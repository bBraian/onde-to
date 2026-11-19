import { act } from 'react';
import { createRoot } from 'react-dom/client';

const created: string[] = [];
const markerEls: HTMLElement[] = [];
vi.mock('../src/components/maplibre', () => {
  class Map {
    constructor() { created.push('map'); }
    on() { return this; }
    addSource() {}
    addLayer() {}
    fitBounds() {}
    jumpTo() {}
    resize() {}
    remove() {}
  }
  class Marker {
    constructor(opts?: { element?: HTMLElement }) { if (opts?.element) markerEls.push(opts.element); }
    setLngLat() { return this; }
    addTo() { return this; }
  }
  class LngLatBounds {
    extend() { return this; }
  }
  return { Map, Marker, LngLatBounds };
});
vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });

const { ResultMap } = await import('../src/components/ResultMap');
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const answer = () => ({ imageId: 'img-1', lat: -23.5, lng: -46.6, regiao: 'SP' });
const guesses = () => [{ guess: { lat: -22.9, lng: -43.2 }, label: 'Ana', avatar: { color: '#FF6B35', eyes: 'normal', mouth: 'sorriso', acc: 'nenhum' } as const }];

test('mesmo resultado em objetos novos não recria o mapa', async () => {
  created.length = 0;
  const el = document.createElement('div');
  const root = createRoot(el);
  await act(async () => { root.render(<ResultMap answer={answer()} guesses={guesses()} />); });
  await act(async () => { root.render(<ResultMap answer={answer()} guesses={guesses()} />); });
  expect(created).toHaveLength(1);
  await act(async () => { root.render(<ResultMap answer={{ ...answer(), imageId: 'img-2' }} guesses={guesses()} />); });
  expect(created).toHaveLength(2);
  root.unmount();
});

test('no duelo o pino do palpite leva o time', async () => {
  markerEls.length = 0;
  const el = document.createElement('div');
  const root = createRoot(el);
  await act(async () => {
    root.render(<ResultMap answer={answer()} guesses={[{ ...guesses()[0], team: 'B' }]} />);
  });
  expect(markerEls.some((m) => m.dataset.team === 'B')).toBe(true);
  root.unmount();
});
