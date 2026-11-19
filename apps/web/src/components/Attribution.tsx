import { config } from '../lib/config';

/** Crédito do Mapillary. Com o Google, o próprio panorama mostra o logo e os termos dele. */
export function Attribution({ autor, className }: { autor?: string; className?: string }) {
  if (config.streetProvider === 'google') return null;
  return (
    <span className={className ?? 'attribution'}>
      {autor ? <>Foto de {autor} · </> : null}
      <a href="https://www.mapillary.com" target="_blank" rel="noreferrer">
        © Mapillary
      </a>
    </span>
  );
}
