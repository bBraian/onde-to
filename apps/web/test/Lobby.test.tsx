import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { DEFAULT_AVATAR, DEFAULT_SETTINGS, type RoomView } from '@onde-to/shared';
import { Lobby } from '../src/pages/room/Lobby';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const view: RoomView = {
  code: 'K7QX', phase: 'lobby', settings: DEFAULT_SETTINGS,
  players: [
    { id: 'a', nick: 'Ana', avatar: DEFAULT_AVATAR, team: 'A', isHost: true, connected: true, spectator: false, hasGuessed: false, total: 0 },
    { id: 'b', nick: 'Bia', avatar: DEFAULT_AVATAR, team: 'B', isHost: false, connected: true, spectator: false, hasGuessed: false, total: 0 },
  ],
  round: null, result: null, history: [], duelHp: null, nextAt: null, winner: null, serverNow: 0, provider: 'mapillary',
};

test('editar o alfinete no lobby abre um modal e envia avatar e apelido sem sair da sala', async () => {
  localStorage.clear();
  const send = vi.fn();
  const el = document.createElement('div');
  document.body.appendChild(el);
  const root = createRoot(el);
  await act(async () => {
    root.render(<MemoryRouter initialEntries={['/sala/K7QX']}><Lobby view={view} me="a" send={send} onLeave={() => {}} /></MemoryRouter>);
  });
  const button = (t: string) => Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.trim() === t)!;
  await act(async () => { button('Editar meu alfinete').click(); });
  expect(el.querySelector('[role="dialog"]')).not.toBeNull();
  await act(async () => { button('Óculos escuros').click(); });
  const input = el.querySelector('#apelido') as HTMLInputElement;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, 'Aninha');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await act(async () => { button('Salvar').click(); });
  expect(send).toHaveBeenCalledWith('room:avatar', expect.objectContaining({ eyes: 'oculos' }));
  expect(send).toHaveBeenCalledWith('room:nick', 'Aninha');
  expect(JSON.parse(localStorage.getItem('onde-to:avatar')!).eyes).toBe('oculos');
  expect(el.querySelector('[role="dialog"]')).toBeNull();
  act(() => root.unmount());
  el.remove();
});
