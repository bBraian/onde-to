import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router';
import { DEFAULT_AVATAR } from '@onde-to/shared';
import { AvatarEditor, AvatarEditorPanel } from '../src/pages/AvatarEditor';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let el: HTMLDivElement;
let root: Root;
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('onde-to:nick', 'Ana');
  localStorage.setItem('onde-to:avatar', JSON.stringify(DEFAULT_AVATAR));
  el = document.createElement('div');
  document.body.appendChild(el);
  root = createRoot(el);
});
afterEach(() => { act(() => root.unmount()); el.remove(); vi.restoreAllMocks(); });

const button = (text: string) => Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.trim() === text)!;
const typeInto = (input: HTMLInputElement, value: string) => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
};
const renderPage = () =>
  act(async () => {
    root.render(
      <MemoryRouter initialEntries={['/avatar']}>
        <Routes>
          <Route path="/avatar" element={<AvatarEditor />} />
          <Route path="/" element={<div>início</div>} />
        </Routes>
      </MemoryRouter>,
    );
  });

test('escolher "Óculos escuros" e salvar grava o avatar e volta ao início', async () => {
  await renderPage();
  await act(async () => { button('Óculos escuros').click(); });
  expect(el.querySelector('[data-part="eyes-oculos"]')).not.toBeNull();
  await act(async () => { button('Salvar e jogar').click(); });
  expect(JSON.parse(localStorage.getItem('onde-to:avatar')!).eyes).toBe('oculos');
  expect(el.textContent).toContain('início');
});

test('"Sortear um visual" troca o avatar', async () => {
  vi.spyOn(Math, 'random').mockReturnValue(0.99);
  await renderPage();
  await act(async () => { button('Sortear um visual').click(); });
  expect(el.querySelector('[data-part="acc-gorro"]')).not.toBeNull();
});

test('apelido vazio desativa o salvar', async () => {
  await renderPage();
  await act(async () => { typeInto(el.querySelector('#apelido') as HTMLInputElement, '   '); });
  expect(button('Salvar e jogar').disabled).toBe(true);
});

test('painel desativa cores já usadas', async () => {
  await act(async () => {
    root.render(<AvatarEditorPanel value={DEFAULT_AVATAR} nick="Ana" onChange={() => {}} takenColors={['#3A86FF']} />);
  });
  expect((el.querySelector('button[aria-label="Azul"]') as HTMLButtonElement).disabled).toBe(true);
  expect((el.querySelector('button[aria-label="Verde"]') as HTMLButtonElement).disabled).toBe(false);
});
