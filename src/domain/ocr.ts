/**
 * Texto reconocido (Vision de Apple) → renglones del ticket.
 * Vision devuelve pedazos de texto con su caja; en un ticket la descripción y los números de una
 * misma línea suelen venir separados. Se agrupan por altura (tolerando que la foto esté algo torcida)
 * y se ordenan de izquierda a derecha.
 */

export interface OcrBox {
  text: string;
  /** Coordenadas normalizadas 0..1 con origen arriba a la izquierda */
  x: number;
  y: number;
  w: number;
  h: number;
  /**
   * Inclinación del pedazo medida en píxeles (Δy/Δx entre sus esquinas superiores; positiva si baja
   * hacia la derecha). Vision la da con las esquinas de cada observación: es la mejor pista para
   * enderezar la foto.
   */
  slope?: number;
}

/**
 * @param aspect alto ÷ ancho de la foto. Las coordenadas de Vision son relativas a cada lado; para
 * medir la inclinación hay que llevarlas a la misma escala (un ticket es largo y angosto).
 */
export function groupIntoLines(boxes: OcrBox[], aspect = 1): string[] {
  const items = boxes
    .filter((b) => b.text.trim())
    .map((b) => ({ ...b, h: b.h * aspect, cx: b.x + b.w / 2, cy: (b.y + b.h / 2) * aspect }));
  if (!items.length) return [];

  // Inclinación de la foto: pendiente mediana entre pedazos de la misma altura aproximada
  const heights = items.map((i) => i.h).sort((a, b) => a - b);
  const medianH = heights[Math.floor(heights.length / 2)] || 0.01;
  // 1) Inclinación propia de cada pedazo (esquinas de Vision). 2) Si no hay, pares de pedazos muy alineados.
  const slopes: number[] = items.filter((i) => typeof i.slope === 'number' && i.w > 0.05).map((i) => i.slope!);
  if (!slopes.length) {
    for (const a of items) {
      for (const b of items) {
        const dx = b.cx - a.cx;
        if (dx > 0.15 && Math.abs(b.cy - a.cy) < medianH * 0.5) slopes.push((b.cy - a.cy) / dx);
      }
    }
  }
  slopes.sort((a, b) => a - b);
  const slope = slopes.length ? slopes[Math.floor(slopes.length / 2)] : 0;

  // Altura «enderezada» de cada pedazo
  const straight = items.map((i) => ({ ...i, sy: i.cy - slope * i.cx })).sort((a, b) => a.sy - b.sy);

  const rows: (typeof straight)[] = [];
  for (const it of straight) {
    const row = rows[rows.length - 1];
    if (row) {
      const avg = row.reduce((s, r) => s + r.sy, 0) / row.length;
      if (Math.abs(it.sy - avg) <= medianH * 0.6) {
        row.push(it);
        continue;
      }
    }
    rows.push([it]);
  }
  return rows.map((r) =>
    r
      .sort((a, b) => a.x - b.x)
      .map((i) => i.text.trim())
      .join(' '),
  );
}
