import { act } from 'react';
import { createRoot } from 'react-dom/client';

const confettiMock = vi.fn();
vi.mock('canvas-confetti', () => ({ default: (...a: unknown[]) => confettiMock(...a) }));
const { celebrate, prefersReducedMotion, useCountUp } = await import('../src/lib/motion');
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const setReduced = (reduce: boolean) =>
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: reduce && q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {} }));

afterEach(() => { vi.unstubAllGlobals(); confettiMock.mockClear(); });

test('prefersReducedMotion lê a preferência do sistema (e é false sem matchMedia)', () => {
  expect(prefersReducedMotion()).toBe(false);
  setReduced(true);
  expect(prefersReducedMotion()).toBe(true);
});

function Counter({ to }: { to: number }) {
  return <span>{useCountUp(to)}</span>;
}

test('useCountUp com movimento reduzido mostra o valor final na hora', async () => {
  setReduced(true);
  const el = document.createElement('div');
  const root = createRoot(el);
  await act(async () => { root.render(<Counter to={4413} />); });
  expect(el.textContent).toBe('4413');
  root.unmount();
});

test('useCountUp sem redução começa abaixo do alvo', async () => {
  setReduced(false);
  const el = document.createElement('div');
  const root = createRoot(el);
  await act(async () => { root.render(<Counter to={4413} />); });
  expect(Number(el.textContent)).toBeLessThan(4413);
  root.unmount();
});

test('celebrate respeita movimento reduzido', () => {
  setReduced(true);
  celebrate('podium');
  expect(confettiMock).not.toHaveBeenCalled();
  setReduced(false);
  celebrate('perfect');
  expect(confettiMock).toHaveBeenCalled();
});
