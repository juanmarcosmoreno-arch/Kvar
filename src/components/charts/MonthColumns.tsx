import { useLayoutEffect, useRef, useState } from 'react';
import { niceTicks } from '../../domain/stats';
import { formatDecimal, locale } from '../../i18n';

export interface MonthValue {
  key: string;
  start: Date;
  value: number;
}

/**
 * Columnas por mes, una sola serie: el mes actual en el color de la marca y el resto en un verde apagado
 * (énfasis, no categorías). Cada columna se puede tocar o enfocar para ver el valor; el mes actual lleva
 * su valor escrito arriba. Eje con valores redondos y líneas de fondo finas.
 */
export function MonthColumns({ data, label, format = (n) => formatDecimal(n, 1) }: {
  data: MonthValue[];
  /** Qué se cuenta («Compras»), para el lector de pantalla y el detalle */
  label: string;
  format?: (n: number) => string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(320);
  const [active, setActive] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(240, e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const height = 168;
  const pad = { top: 22, right: 4, bottom: 24, left: 30 };
  const ticks = niceTicks(Math.max(...data.map((d) => d.value), 0));
  const top = ticks[ticks.length - 1] || 1;
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const band = plotW / data.length;
  const barW = Math.min(24, Math.max(6, band * 0.62));
  const y = (v: number) => pad.top + plotH - (v / top) * plotH;
  const month = (d: Date) =>
    d.toLocaleDateString(locale, { month: data.length > 6 ? 'narrow' : 'short' }).replace('.', '');
  const longMonth = (d: Date) => d.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  const last = data.length - 1;
  const shown = active ?? null;

  /** Columna con la punta redondeada (4px) y la base recta */
  const column = (x: number, v: number) => {
    const h = Math.max(0, (v / top) * plotH);
    if (h <= 0) return '';
    const r = Math.min(4, h, barW / 2);
    const yTop = pad.top + plotH - h;
    const base = pad.top + plotH;
    return `M${x},${base} V${yTop + r} Q${x},${yTop} ${x + r},${yTop} H${x + barW - r} Q${x + barW},${yTop} ${x + barW},${yTop + r} V${base} Z`;
  };

  return (
    <div ref={box} className="relative select-none" onPointerLeave={() => setActive(null)}>
      <svg width={width} height={height} role="img" aria-label={label} className="block overflow-visible">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} className="stroke-line" strokeWidth={1} />
            <text x={pad.left - 6} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted text-[11px] tabular-nums">
              {format(t)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = pad.left + i * band + (band - barW) / 2;
          const current = i === last;
          const hot = shown === i;
          return (
            <g
              key={d.key}
              tabIndex={0}
              role="img"
              aria-label={`${longMonth(d.start)}: ${format(d.value)}`}
              onPointerEnter={() => setActive(i)}
              onPointerDown={() => setActive(i)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              className="cursor-default outline-none"
            >
              {/* Zona táctil: toda la franja del mes, no solo la columna */}
              <rect x={pad.left + i * band} y={pad.top} width={band} height={plotH + pad.bottom} fill="transparent" />
              <path
                d={column(x, d.value)}
                className={`${current ? 'fill-primary' : 'fill-chart-quiet'} transition-opacity ${shown !== null && !hot ? 'opacity-60' : ''}`}
              />
              {current && d.value > 0 && shown === null && (
                <text x={x + barW / 2} y={y(d.value) - 6} textAnchor="middle" className="fill-ink text-[12px] font-semibold">
                  {format(d.value)}
                </text>
              )}
              <text
                x={pad.left + i * band + band / 2}
                y={height - 6}
                textAnchor="middle"
                className={`text-[11px] ${current || hot ? 'fill-ink font-medium' : 'fill-muted'}`}
              >
                {month(d.start)}
              </text>
            </g>
          );
        })}
      </svg>
      {shown !== null && (
        <div
          className="pointer-events-none absolute z-10 rounded-xl border border-line bg-surface px-3 py-2 text-sm shadow-lg"
          style={{
            left: Math.min(Math.max(0, pad.left + shown * band + band / 2 - 60), width - 120),
            top: Math.max(0, y(data[shown].value) - 58),
            width: 120,
          }}
          role="status"
        >
          <div className="text-base font-semibold">{format(data[shown].value)}</div>
          <div className="text-xs text-muted">{longMonth(data[shown].start)}</div>
        </div>
      )}
    </div>
  );
}
