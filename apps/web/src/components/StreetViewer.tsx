import type { Movement } from '@onde-to/shared';
import { config } from '../lib/config';
import { MapillaryViewer } from './street/MapillaryViewer';
import { GoogleViewer } from './street/GoogleViewer';

interface Props {
  /** Id do lugar no provedor configurado (image_id do Mapillary ou pano_id do Google). */
  imageId: string;
  movement: Movement;
  onError?: () => void;
}

/** Escolhe o visor pelo provedor configurado (VITE_STREET_PROVIDER). */
export function StreetViewer({ imageId, movement, onError }: Props) {
  if (config.fakeViewer) {
    return (
      <div className="street street-fake" data-testid="fake-viewer">
        {imageId}
      </div>
    );
  }
  return config.streetProvider === 'google' ? (
    <GoogleViewer panoId={imageId} movement={movement} onError={onError} />
  ) : (
    <MapillaryViewer imageId={imageId} movement={movement} onError={onError} />
  );
}
