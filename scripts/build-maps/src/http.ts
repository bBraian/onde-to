// HTTP com repetição, compartilhado pelas fontes do Mapillary e do Google.

/** Erro que não adianta repetir nem pular (token inválido ou sem permissão): aborta a geração do mapa. */
export class FatalSearchError extends Error {
  name = 'FatalSearchError';
}

const MAX_RETRIES = 3;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** GET com até 3 repetições em erro de rede, 429 e 5xx. 401/403 → FatalSearchError; outros erros → Error. */
export async function fetchWithRetry(url: string): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    let res: Response;
    try {
      res = await fetch(url);
    } catch (err) {
      if (attempt >= MAX_RETRIES) throw err;
      await sleep(1000 * 2 ** attempt);
      continue;
    }
    if (res.ok) return res;
    if (res.status === 401 || res.status === 403) throw new FatalSearchError(`Mapillary HTTP ${res.status}: ${await res.text()}`);
    const retriable = res.status === 429 || res.status >= 500;
    if (!retriable || attempt >= MAX_RETRIES) throw new Error(`Mapillary HTTP ${res.status}: ${await res.text()}`);
    await sleep(1000 * 2 ** attempt);
  }
}

