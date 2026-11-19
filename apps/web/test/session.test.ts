import { getSession, getNick, setNick } from '../src/lib/session';

afterEach(() => { vi.restoreAllMocks(); });

test('session persiste no localStorage', () => {
  const a = getSession();
  expect(getSession()).toBe(a);
  expect(localStorage.getItem('onde-to:session')).toBe(a);
});

test('funciona com localStorage bloqueado', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
  const a = getSession();
  expect(a).toMatch(/^[0-9a-f-]{36}$/);
  expect(getSession()).toBe(a);
  setNick('Ana');
  expect(getNick()).toBe('Ana');
});

test('apelido vazio por padrão', () => {
  localStorage.clear();
  expect(typeof getNick()).toBe('string');
});
