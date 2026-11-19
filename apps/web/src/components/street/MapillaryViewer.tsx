import { useEffect, useRef, useState } from 'react';
import { CancelMapillaryError, Viewer, type ComponentOptions } from 'mapillary-js';
import 'mapillary-js/dist/mapillary.css';
import type { Movement } from '@onde-to/shared';
import { config } from '../../lib/config';
import { viewerComponents } from '../viewerOptions';

interface Props {
  imageId: string;
  movement: Movement;
  onError?: () => void;
}

export function MapillaryViewer({ imageId, movement, onError }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const viewer = useRef<Viewer | null>(null);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (config.fakeViewer || !config.mapillaryToken || !container.current) return;
    const v = new Viewer({
      accessToken: config.mapillaryToken,
      container: container.current,
      component: viewerComponents(movement) as ComponentOptions,
    });
    viewer.current = v;
    return () => {
      v.remove();
      viewer.current = null;
    };
  }, [movement]);

  useEffect(() => {
    setFailed(false);
    const v = viewer.current;
    if (!v) return;
    let active = true;
    v.moveTo(imageId).catch((err: unknown) => {
      // Um moveTo novo ("Voltar ao início", setas) ou o remove() do visor cancelam o pedido pendente:
      // isso não é imagem quebrada. Também ignoramos qualquer resposta depois de desmontar.
      if (!active || err instanceof CancelMapillaryError) return;
      setFailed(true);
      onErrorRef.current?.();
    });
    return () => {
      active = false;
    };
  }, [imageId, movement]);

  if (config.fakeViewer) {
    return (
      <div className="street street-fake" data-testid="fake-viewer">
        {imageId}
      </div>
    );
  }

  if (!config.mapillaryToken) {
    return (
      <div className="street street-msg" role="alert">
        Falta configurar o token do Mapillary (VITE_MAPILLARY_TOKEN).
      </div>
    );
  }

  return (
    <div className="street">
      <div ref={container} className="street-canvas" />
      {failed && (
        <div className="street-msg" role="alert">
          Imagem indisponível
        </div>
      )}
      {movement === 'move' && !failed && (
        <button type="button" className="btn btn-hud street-back" onClick={() => viewer.current?.moveTo(imageId).catch(() => {})}>
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 14L4 9l5-5" />
            <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
          </svg>
          Voltar ao início
        </button>
      )}
    </div>
  );
}
