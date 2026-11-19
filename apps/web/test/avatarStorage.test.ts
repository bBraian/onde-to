import { DEFAULT_AVATAR, sanitizeAvatar } from '@onde-to/shared';
import { getAvatar, setAvatar } from '../src/avatar/storage';

beforeEach(() => localStorage.clear());

test('vazio sorteia um avatar válido e guarda', () => {
  const a = getAvatar();
  expect(sanitizeAvatar(a)).toEqual(a);
  expect(getAvatar()).toEqual(a);
});

test('valor corrompido vira o padrão', () => {
  localStorage.setItem('onde-to:avatar', '{"color":1}');
  expect(getAvatar()).toEqual(DEFAULT_AVATAR);
  localStorage.setItem('onde-to:avatar', 'não é json');
  expect(getAvatar()).toEqual(DEFAULT_AVATAR);
});

test('setAvatar guarda sanitizado', () => {
  setAvatar({ color: '#2EC4B6', eyes: 'brilho', mouth: 'lingua', acc: 'gorro' });
  expect(getAvatar()).toEqual({ color: '#2EC4B6', eyes: 'brilho', mouth: 'lingua', acc: 'gorro' });
});
