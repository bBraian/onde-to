import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Attribution } from '../src/components/Attribution';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
afterEach(() => vi.unstubAllEnvs());

async function render() {
  const el = document.createElement('div');
  const root = createRoot(el);
  await act(async () => { root.render(<Attribution autor="ana" />); });
  return { el, root };
}

test('com Mapillary mostra o crédito do Mapillary', async () => {
  const { el, root } = await render();
  expect(el.textContent).toContain('© Mapillary');
  act(() => root.unmount());
});

test('com Google não mostra crédito do Mapillary (o Google mostra o próprio)', async () => {
  vi.stubEnv('VITE_STREET_PROVIDER', 'google');
  const { el, root } = await render();
  expect(el.textContent).not.toContain('Mapillary');
  act(() => root.unmount());
});
