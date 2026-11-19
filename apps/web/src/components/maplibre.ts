import { setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import 'maplibre-gl/dist/maplibre-gl.css';

// O MapLibre deduz o endereço do worker a partir de onde o próprio módulo está; com o Vite
// (pré-empacotamento no dev e bundle no build) esse lugar muda e o worker não é achado.
// O `?url` faz o Vite publicar o worker (que não tem dependências) e devolver o endereço certo.
setWorkerUrl(workerUrl);

export { LngLatBounds, Map, Marker } from 'maplibre-gl';
