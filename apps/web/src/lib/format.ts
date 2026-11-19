const nf = new Intl.NumberFormat('pt-BR');

export const formatPoints = (n: number) => nf.format(n);

export function formatKm(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1).replace('.', ',')} km`;
  return `${nf.format(Math.round(km))} km`;
}
