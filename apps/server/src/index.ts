import { createServer } from './socket';

const port = Number(process.env.PORT ?? 3001);
const corsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:5173';
const enableTestMap = process.env.ENABLE_TEST_MAP === '1';

createServer({ port, corsOrigin, enableTestMap }).then((s) => {
  console.log(`Servidor ouvindo na porta ${s.port} (CORS: ${corsOrigin}${enableTestMap ? ', mapa de teste ligado' : ''})`);
});
