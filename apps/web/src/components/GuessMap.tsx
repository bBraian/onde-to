import { useEffect, useRef } from 'react';
import type { Avatar, LatLng } from '@onde-to/shared';
import { Map as MlMap, Marker } from './maplibre';
import { pinSvg } from '../avatar/pinSvg';
import { MAP_STYLE, toLngLat, type MapView } from './mapStyle';

export interface MapPin {
  id: string;
  avatar: Avatar;
  guess: LatLng;
}

interface Props {
  pins: MapPin[];
  onPick: (p: LatLng) => void;
  disabled?: boolean;
  view: MapView;
}

const PIN_SIZE = 40;

function pinElement(pin: MapPin): HTMLElement {
  const el = document.createElement('div');
  el.className = 'map-avatar';
  el.dataset.pin = pin.id;
  el.innerHTML = pinSvg(pin.avatar, PIN_SIZE);
  return el;
}

/** Reinicia o "boing" do pino (feedback de que o palpite foi colocado/movido). */
function boing(el: HTMLElement) {
  el.classList.remove('boing');
  void el.offsetWidth;
  el.classList.add('boing');
}

/** Mapa de palpite: cada pino é o avatar do dono. O clique chama onPick (o dono decide de quem é o pino). */
export function GuessMap({ pins, onPick, disabled, view }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MlMap | null>(null);
  const markers = useRef(new Map<string, { marker: Marker; el: HTMLElement; look: string; at: string }>());
  const onPickRef = useRef(onPick);
  const disabledRef = useRef(disabled);
  onPickRef.current = onPick;
  disabledRef.current = disabled;

  useEffect(() => {
    if (!container.current) return;
    const m = new MlMap({ container: container.current, style: MAP_STYLE, center: view.center, zoom: view.zoom, attributionControl: { compact: true } });
    m.on('click', (e) => {
      if (disabledRef.current) return;
      const p = e.lngLat.wrap();
      onPickRef.current({ lat: p.lat, lng: p.lng });
    });
    map.current = m;
    const ro = new ResizeObserver(() => m.resize());
    ro.observe(container.current);
    const current = markers.current;
    return () => {
      ro.disconnect();
      m.remove();
      map.current = null;
      current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const live = markers.current;
    for (const [id, entry] of live) {
      if (!pins.some((p) => p.id === id)) {
        entry.marker.remove();
        live.delete(id);
      }
    }
    for (const pin of pins) {
      const look = JSON.stringify(pin.avatar);
      const at = `${pin.guess.lat},${pin.guess.lng}`;
      const entry = live.get(pin.id);
      if (!entry) {
        const el = pinElement(pin);
        const marker = new Marker({ element: el, anchor: 'bottom' }).setLngLat(toLngLat(pin.guess)).addTo(m);
        live.set(pin.id, { marker, el, look, at });
        boing(el);
        continue;
      }
      if (entry.look !== look) {
        entry.el.innerHTML = pinSvg(pin.avatar, PIN_SIZE);
        entry.look = look;
      }
      if (entry.at !== at) {
        entry.marker.setLngLat(toLngLat(pin.guess));
        entry.at = at;
        boing(entry.el);
      }
    }
  }, [pins]);

  return <div ref={container} className="guess-map-canvas" data-testid="guess-map" />;
}
