/** Compara versiones "1.2.3". Devuelve <0, 0 o >0. Ignora sufijos (-beta). */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('-')[0].split('.').map((n) => Number.parseInt(n, 10) || 0);
  const pb = b.split('-')[0].split('.').map((n) => Number.parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

/** ¿Esta versión de la app ya no es compatible con la base y tiene que actualizarse? */
export function mustUpdate(current: string, minimum: string | null | undefined): boolean {
  return Boolean(minimum) && compareVersions(current, minimum!) < 0;
}
