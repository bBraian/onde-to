import { clockOffset } from '../src/lib/socket';
import { remainingSec } from '../src/lib/clock';

test('clockOffset é servidor − local', () => {
  expect(clockOffset(10_000, 7_000)).toBe(3_000);
  expect(clockOffset(7_000, 10_000)).toBe(-3_000);
});

test('com o offset, o tempo restante bate com o relógio do servidor', () => {
  const serverNow = 1_000_000, localNow = 940_000; // relógio local 60 s atrasado
  const deadline = serverNow + 15_000;
  const offset = clockOffset(serverNow, localNow);
  expect(remainingSec(deadline, localNow, offset)).toBe(remainingSec(deadline, serverNow));
  expect(remainingSec(deadline, localNow, offset)).toBe(15);
});
