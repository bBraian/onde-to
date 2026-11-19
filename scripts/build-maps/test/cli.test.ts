import { parseArgs } from '../src/cli';

test('parseArgs lê --provider e os mapas', () => {
  expect(parseArgs(['--provider', 'google', 'brasil'])).toEqual({ provider: 'google', ids: ['brasil'] });
  expect(parseArgs(['mundo'])).toEqual({ provider: 'mapillary', ids: ['mundo'] });
  expect(parseArgs([]).ids).toEqual(['brasil', 'capitais-br', 'capitais-mundo', 'mundo']);
});
