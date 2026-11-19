import { createServer } from './socket';

const port = Number(process.env.PORT ?? 3001);
const corsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:5173';
const enableTestMap = process.env.ENABLE_TEST_MAP === '1';
const provider = process.env.STREET_PROVIDER === 'google' ? 'google' : 'mapillary';

createServer({ port, corsOrigin, enableTestMap, provider }).then((s) => {
  console.log(
    `Servidor ouvindo na porta ${s.port} (CORS: ${corsOrigin}, imagens: ${provider}${enableTestMap ? ', mapa de teste ligado' : ''})`,
  );
});
