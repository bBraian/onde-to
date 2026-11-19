import { useEffect, useMemo, useRef } from 'react';
import { LngLatBounds, Map as MlMap, Marker } from './maplibre';
import type { LatLng, MapPoint } from '@onde-to/shared';
import { MAP_STYLE, toLngLat } from './mapStyle';

export interface ResultGuess {
  guess: LatLng | null;
  label: string;
  color: string;
}

function flagElement(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'map-flag';
  el.setAttribute('aria-label', 'Local certo');
  el.innerHTML =
    '<svg width="40" height="40" viewBox="0 0 24 24" fill="#1F6B4F" stroke="#17231E" stroke-width="1.4"><path d="M5 21V4"/><path d="M5 4h12l-2.5 4L17 12H5"/></svg>';
  return el;
}

function bubbleElement(label: string, color: string): HTMLElement {
  const el = document.createElement('div');
  el.className = 'map-bubble';
  el.style.background = color;
  el.textContent = label.slice(0, 1).toUpperCase();
  el.title = label;
  return el;
}

export function ResultMap({ answer, guesses }: { answer: MapPoint; guesses: ResultGuess[] }) {
  const container = useRef<HTMLDivElement>(null);
  // O servidor manda objetos novos a cada mensagem: o mapa só é refeito quando o conteúdo muda,
  // senão um reconectar de alguém zeraria o zoom de todo mundo.
  const signature = useMemo(() => JSON.stringify([answer.imageId, answer.lat, answer.lng, guesses]), [answer, guesses]);

  useEffect(() => {
    if (!container.current) return;
    const m = new MlMap({ container: container.current, style: MAP_STYLE, center: toLngLat(answer), zoom: 4, attributionControl: { compact: true } });
    const placed = guesses.filter((g): g is ResultGuess & { guess: LatLng } => g.guess !== null);

    new Marker({ element: flagElement(), anchor: 'bottom-left' }).setLngLat(toLngLat(answer)).addTo(m);
    for (const g of placed) new Marker({ element: bubbleElement(g.label, g.color) }).setLngLat(toLngLat(g.guess)).addTo(m);

    m.on('load', () => {
      m.addSource('lines', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: placed.map((g) => ({
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates: [toLngLat(answer), toLngLat(g.guess)] },
          })),
        },
      });
      m.addLayer({ id: 'lines', type: 'line', source: 'lines', paint: { 'line-color': '#17231E', 'line-width': 2, 'line-dasharray': [2, 1.5] } });
    });

    if (placed.length) {
      const bounds = new LngLatBounds(toLngLat(answer), toLngLat(answer));
      for (const g of placed) bounds.extend(toLngLat(g.guess));
      m.fitBounds(bounds, { padding: 70, maxZoom: 13, duration: 0 });
    } else {
      m.jumpTo({ center: toLngLat(answer), zoom: 10 });
    }

    const ro = new ResizeObserver(() => m.resize());
    ro.observe(container.current);
    return () => {
      ro.disconnect();
      m.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  return <div ref={container} className="result-map-canvas" data-testid="result-map" />;
}
