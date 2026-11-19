import { useEffect, useRef } from 'react';
import { Map as MlMap, Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { LatLng } from '@onde-to/shared';
import { MAP_STYLE, toLngLat, type MapView } from './mapStyle';

interface Props {
  value: LatLng | null;
  onChange: (p: LatLng) => void;
  disabled?: boolean;
  view: MapView;
}

function pinElement(color: string): HTMLElement {
  const el = document.createElement('div');
  el.className = 'map-pin';
  el.innerHTML = `<svg width="34" height="34" viewBox="0 0 24 24" fill="${color}" stroke="#17231E" stroke-width="1.5"><path d="M12 22s-7-6.2-7-11.5A7 7 0 0 1 19 10.5C19 15.8 12 22 12 22z"/><circle cx="12" cy="10.5" r="2.6" fill="#F4F1E8"/></svg>`;
  return el;
}

export function GuessMap({ value, onChange, disabled, view }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MlMap | null>(null);
  const marker = useRef<Marker | null>(null);
  const onChangeRef = useRef(onChange);
  const disabledRef = useRef(disabled);
  onChangeRef.current = onChange;
  disabledRef.current = disabled;

  useEffect(() => {
    if (!container.current) return;
    const m = new MlMap({ container: container.current, style: MAP_STYLE, center: view.center, zoom: view.zoom, attributionControl: { compact: true } });
    m.on('click', (e) => {
      if (disabledRef.current) return;
      const p = e.lngLat.wrap();
      onChangeRef.current({ lat: p.lat, lng: p.lng });
    });
    map.current = m;
    const ro = new ResizeObserver(() => m.resize());
    ro.observe(container.current);
    return () => {
      ro.disconnect();
      m.remove();
      map.current = null;
      marker.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    if (!value) {
      marker.current?.remove();
      marker.current = null;
      return;
    }
    if (!marker.current) marker.current = new Marker({ element: pinElement('#E2582A'), anchor: 'bottom' }).setLngLat(toLngLat(value)).addTo(m);
    else marker.current.setLngLat(toLngLat(value));
  }, [value]);

  return <div ref={container} className="guess-map-canvas" data-testid="guess-map" />;
}
