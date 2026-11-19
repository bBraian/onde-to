export function Attribution({ autor, className }: { autor?: string; className?: string }) {
  return (
    <span className={className ?? 'attribution'}>
      {autor ? <>Foto de {autor} · </> : null}
      <a href="https://www.mapillary.com" target="_blank" rel="noreferrer">
        © Mapillary
      </a>
    </span>
  );
}
