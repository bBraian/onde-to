import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { HpBars } from '../src/components/HpBars';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
afterEach(() => vi.unstubAllGlobals());

const fillB = (el: HTMLElement) => (el.querySelector('.hp-fill-B') as HTMLElement).style.transform;

test('a barra começa na vida anterior e desce até a nova', async () => {
  const el = document.createElement('div');
  const root = createRoot(el);
  await act(async () => { root.render(<HpBars hp={{ A: 6000, B: 3000 }} from={{ A: 6000, B: 6000 }} startHp={6000} />); });
  expect(fillB(el)).toBe('scaleX(1)');
  await act(async () => { await new Promise((r) => setTimeout(r, 60)); });
  expect(fillB(el)).toBe('scaleX(0.5)');
  act(() => root.unmount());
});

test('com movimento reduzido já mostra a vida nova', async () => {
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {} }));
  const el = document.createElement('div');
  const root = createRoot(el);
  await act(async () => { root.render(<HpBars hp={{ A: 6000, B: 3000 }} from={{ A: 6000, B: 6000 }} startHp={6000} />); });
  expect(fillB(el)).toBe('scaleX(0.5)');
  act(() => root.unmount());
});
