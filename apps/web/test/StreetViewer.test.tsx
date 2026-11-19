import { StrictMode, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

// Imita o Navigator do MapillaryJS 4.1.2: um moveTo novo ou remove() aborta o pedido pendente com CancelMapillaryError.
const instances: { pending: { res: (v: unknown) => void; rej: (e: unknown) => void } | null; removed: boolean }[] = [];
vi.mock('mapillary-js', () => {
  class CancelMapillaryError extends Error {
    name = 'CancelMapillaryError';
  }
  class Viewer {
    pending: { res: (v: unknown) => void; rej: (e: unknown) => void } | null = null;
    removed = false;
    constructor() {
      instances.push(this);
    }
    moveTo(id: string) {
      if (this.pending) this.pending.rej(new CancelMapillaryError(`aborted by request to id ${id}`));
      return new Promise((res, rej) => {
        this.pending = { res, rej };
      });
    }
    remove() {
      this.removed = true;
      this.pending?.rej(new CancelMapillaryError('aborted: viewer removed'));
      this.pending = null;
    }
  }
  return { Viewer, CancelMapillaryError };
});

const { MapillaryViewer: StreetViewer } = await import('../src/components/street/MapillaryViewer');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });
const live = () => instances.filter((v) => !v.removed).at(-1)!;

let el: HTMLDivElement;
let root: Root;
beforeEach(() => {
  instances.length = 0;
  vi.stubEnv('VITE_MAPILLARY_TOKEN', 'tok');
  vi.stubEnv('VITE_FAKE_VIEWER', '');
  el = document.createElement('div');
  document.body.appendChild(el);
  root = createRoot(el);
});
afterEach(() => {
  vi.unstubAllEnvs();
  el.remove();
});

test('StrictMode: imagem que carrega não vira "Imagem indisponível"', async () => {
  const onError = vi.fn();
  await act(async () => {
    root.render(<StrictMode><StreetViewer imageId="img-1" movement="move" onError={onError} /></StrictMode>);
  });
  await flush();
  await act(async () => { live().pending?.res({ id: 'img-1' }); });
  await flush();
  expect(onError).not.toHaveBeenCalled();
  expect(el.textContent).not.toContain('Imagem indisponível');
  root.unmount();
});

test('"Voltar ao início" durante o carregamento não marca a imagem como quebrada', async () => {
  const onError = vi.fn();
  await act(async () => { root.render(<StreetViewer imageId="img-1" movement="move" onError={onError} />); });
  const btn = Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes('Voltar ao início'))!;
  await act(async () => { btn.click(); });
  await flush();
  await act(async () => { live().pending?.res({ id: 'img-1' }); });
  await flush();
  expect(onError).not.toHaveBeenCalled();
  expect(el.textContent).not.toContain('Imagem indisponível');
  root.unmount();
});

test('desmontar durante o carregamento não chama onError', async () => {
  const onError = vi.fn();
  await act(async () => { root.render(<StreetViewer imageId="img-1" movement="move" onError={onError} />); });
  await act(async () => { root.unmount(); });
  await flush();
  expect(onError).not.toHaveBeenCalled();
});

test('falha de verdade mostra "Imagem indisponível" e chama onError uma vez', async () => {
  const onError = vi.fn();
  await act(async () => { root.render(<StreetViewer imageId="img-1" movement="move" onError={onError} />); });
  await act(async () => { live().pending?.rej(new Error('Failed to fetch')); });
  await flush();
  expect(onError).toHaveBeenCalledTimes(1);
  expect(el.textContent).toContain('Imagem indisponível');
  root.unmount();
});
