import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { groupIntoLines, type OcrBox } from '../ocr';
import { buildReview, parseReceiptText, planReceipt, productNameFromLine } from '../receipt';

const ticket = readFileSync(resolve(__dirname, '../../assets/demo/ticket-macromercado.txt'), 'utf8');

/**
 * Simula lo que devuelve Vision para una foto de ticket (alto = 2,2 × ancho): cada línea partida en
 * descripción y números, la foto torcida y los pedazos desordenados.
 */
const ASPECT = 2.2;
function simulateVision(text: string, skew = 0.02): OcrBox[] {
  const boxes: OcrBox[] = [];
  text.split('\n').forEach((line, i) => {
    const y = 0.02 + i * 0.012;
    const m = /^(.*?)\s+(\d+,\d{3}\s+\d+,\d{2}\s+-?\d+,\d{2}[A-Z]?)$/.exec(line);
    const parts = m ? [m[1], m[2]] : [line];
    parts.forEach((p, j) => {
      const x = j === 0 ? 0.05 : 0.62;
      boxes.push({ text: p, x, y: y + (skew * x) / ASPECT, w: j === 0 ? 0.5 : 0.33, h: 0.009, slope: skew });
    });
  });
  return boxes.sort(() => 0.5 - Math.random()); // Vision no garantiza orden
}

describe('lectura de la foto del ticket', () => {
  it('rearma los renglones aunque la foto esté torcida y los pedazos vengan desordenados', () => {
    const lines = groupIntoLines(simulateVision(ticket, 0.03), ASPECT); // ~1,7° de inclinación
    expect(lines).toContain('168953 LECHE CLADY ULTRA ENTERA S/FRIO 1LT X 4 2,000 185,07 370,14E');
    const parsed = parseReceiptText(lines.join('\n'));
    expect(parsed.lines).toHaveLength(57);
    expect(parsed.difference).toBe(0); // la suma sigue cerrando con el total
  });

  it('sin inclinación conocida, se arregla con fotos derechas', () => {
    const boxes = simulateVision(ticket, 0).map(({ slope: _s, ...b }) => b);
    expect(parseReceiptText(groupIntoLines(boxes, ASPECT).join('\n')).difference).toBe(0);
  });

  it('caja vacía', () => {
    expect(groupIntoLines([])).toEqual([]);
  });
});

describe('revisión del ticket', () => {
  const parsed = parseReceiptText(ticket);
  const products = [
    { id: 'leche', name: 'Leche' },
    { id: 'fideos', name: 'Fideos' },
    { id: 'harina', name: 'Harina' },
  ];

  it('nombres limpios para productos nuevos', () => {
    expect(productNameFromLine('Cefa pasas de uva sultaninas 500 grs.')).toBe('Cefa pasas de uva sultaninas');
    expect(productNameFromLine('Yogur conaprole biotop vainilla 1k+200gr')).toBe('Yogur conaprole biotop vainilla');
    expect(productNameFromLine('Pañales bummis pants xg x 26')).toBe('Pañales bummis pants xg');
    expect(productNameFromLine('Cocoa copacabana 500 grs+100 grs. gratis')).toBe('Cocoa copacabana');
  });

  it('suma las líneas del mismo producto y aprende el código del súper', () => {
    const review = buildReview(parsed, [], products);
    const plan = planReceipt(review, parsed.store);
    expect(plan.existing.get('harina')).toBe(16); // 12 + 4 de las dos líneas de harina
    expect(plan.existing.get('fideos')).toBe(6); // cinco líneas de fideos Adria (una con 2)
    expect(plan.existing.get('leche')).toBe(8); // 2 packs × 4
    expect(plan.learn).toContainEqual({ text: 'macromercado 41949', productId: 'harina', newName: null });
    expect(plan.created.size).toBeGreaterThan(30);
  });

  it('lo que el usuario descarta no se aplica ni se aprende', () => {
    const review = buildReview(parsed, [], products).map((r) => ({ ...r, include: r.productId === 'leche' }));
    const plan = planReceipt(review, parsed.store);
    expect([...plan.existing.keys()]).toEqual(['leche']);
    expect(plan.created.size).toBe(0);
    expect(plan.learn).toHaveLength(2);
  });
});
