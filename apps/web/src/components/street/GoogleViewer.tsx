import { useEffect, useRef, useState } from 'react';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import type { Movement } from '@onde-to/shared';
import { config } from '../../lib/config';
import { googlePanoramaOptions } from '../viewerOptions';

/**
 * O Google cobra cada StreetViewPanorama criado. Por isso existe UM panorama por sessão da página:
 * ele vive num <div> próprio que é encaixado no visor montado e só troca de lugar (setPano) entre as rodadas.
 */
interface Shared {
  host: HTMLDivElement;
  pano: google.maps.StreetViewPanorama;
}
let shared: Promise<Shared> | null = null;
let configuredKey: string | null = null;
let statusHandler: ((status: string) => void) | null = null;

function getShared(key: string, movement: Movement, panoId: string, mount: HTMLElement): Promise<Shared> {
  if (configuredKey === null) {
    setOptions({ key, language: 'pt-BR', region: 'BR' });
    configuredKey = key;
  }
  if (!shared) {
    shared = importLibrary('streetView')
      .then(({ StreetViewPanorama }) => {
        const host = document.createElement('div');
        host.className = 'street-canvas';
        // constrói já encaixado na página: um panorama criado num <div> solto nasce com 0×0
        mount.prepend(host);
        const pano = new StreetViewPanorama(host, { ...googlePanoramaOptions(movement), pano: panoId, pov: { heading: 0, pitch: 0 }, zoom: 0 });
        pano.addListener('status_changed', () => statusHandler?.(String(pano.getStatus())));
        return { host, pano };
      })
      .catch((err) => {
        shared = null; // deixa tentar de novo na próxima montagem
        throw err;
      });
  }
  return shared;
}

interface Props {
  panoId: string;
  movement: Movement;
  onError?: () => void;
}

export function GoogleViewer({ panoId, movement, onError }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const instance = useRef<Shared | null>(null);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const [failed, setFailed] = useState(false);
  const key = config.googleMapsKey;

  useEffect(() => {
    if (!key) return;
    let active = true;
    setFailed(false);
    const fail = () => {
      if (!active) return;
      setFailed(true);
      onErrorRef.current?.();
    };
    statusHandler = (status) => {
      if (status !== 'OK') fail();
    };
    getShared(key, movement, panoId, container.current!)
      .then((s) => {
        if (!active || !container.current) return;
        instance.current = s;
        container.current.prepend(s.host);
        s.pano.setOptions(googlePanoramaOptions(movement));
        s.pano.setPano(panoId);
        s.pano.setPov({ heading: 0, pitch: 0 });
      })
      .catch(fail);
    return () => {
      active = false;
      statusHandler = null;
      instance.current?.host.remove();
      instance.current = null;
    };
  }, [key, panoId, movement]);

  if (!key) {
    return (
      <div className="street street-msg" role="alert">
        Falta configurar a chave do Google (VITE_GOOGLE_MAPS_KEY).
      </div>
    );
  }

  return (
    <div className="street" ref={container}>
      {movement === 'nmpz' && <div className="street-lock" aria-hidden="true" />}
      {failed && (
        <div className="street-msg" role="alert">
          Imagem indisponível
        </div>
      )}
      {movement === 'move' && !failed && (
        <button
          type="button"
          className="btn btn-hud street-back"
          onClick={() => {
            instance.current?.pano.setPano(panoId);
            instance.current?.pano.setPov({ heading: 0, pitch: 0 });
          }}
        >
          Voltar ao início
        </button>
      )}
    </div>
  );
}
