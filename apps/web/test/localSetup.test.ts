import { DEFAULT_AVATAR } from '@onde-to/shared';
import { loadLocalSetup, saveLocalSetup } from '../src/lib/localSetup';

beforeEach(() => localStorage.clear());

test('sem nada salvo: 1 jogador com o apelido e o avatar salvos e regras padrão', () => {
  localStorage.setItem('onde-to:nick', 'Ana');
  localStorage.setItem('onde-to:avatar', JSON.stringify({ ...DEFAULT_AVATAR, acc: 'coroa' }));
  const s = loadLocalSetup();
  expect(s.players).toHaveLength(1);
  expect(s.players[0]).toMatchObject({ nick: 'Ana', avatar: { acc: 'coroa' } });
  expect(s.settings).toMatchObject({ rounds: 5, timeSec: null, movement: 'move', guessMode: 'turns', scoring: 'distance' });
});

test('sem apelido salvo, o jogador 1 se chama "Jogador 1"', () => {
  expect(loadLocalSetup().players[0].nick).toBe('Jogador 1');
});

test('salvar e carregar faz a ida e volta', () => {
  const s = loadLocalSetup();
  const players = [...s.players, { id: 'x', nick: 'Bia', avatar: { ...DEFAULT_AVATAR, color: '#3A86FF' } }];
  saveLocalSetup({ players, settings: { ...s.settings, guessMode: 'same-map', scoring: 'rounds', rounds: 3 } });
  const again = loadLocalSetup();
  expect(again.players.map((p) => p.nick)).toEqual([s.players[0].nick, 'Bia']);
  expect(again.settings).toMatchObject({ guessMode: 'same-map', scoring: 'rounds', rounds: 3 });
});

test('valor corrompido vira o padrão; avatar inválido é corrigido; no máximo 8 jogadores', () => {
  localStorage.setItem('onde-to:local', '{"players":[{"id":"a","nick":"","avatar":"lixo"}],"settings":{"rounds":"x"}}');
  const s = loadLocalSetup();
  expect(s.players[0].avatar).toEqual(DEFAULT_AVATAR);
  expect(s.players[0].nick).toBe('Jogador 1');
  expect(s.settings.rounds).toBe(5);
  localStorage.setItem('onde-to:local', JSON.stringify({ players: Array.from({ length: 12 }, (_, i) => ({ id: `p${i}`, nick: `P${i}`, avatar: DEFAULT_AVATAR })), settings: {} }));
  expect(loadLocalSetup().players).toHaveLength(8);
  localStorage.setItem('onde-to:local', 'não é json');
  expect(loadLocalSetup().players).toHaveLength(1);
});
