import { describe, expect, it } from 'vitest';
import {
  learnAlias, normalizeAlias, normalizeBarcode, resolveAlias, searchProducts, similarity, type Alias,
} from '../aliases';

const products = [
  { id: 'leche', name: 'Leche entera' },
  { id: 'leche-d', name: 'Leche descremada' },
  { id: 'fideos', name: 'Fideos' },
  { id: 'yerba', name: 'Yerba' },
  { id: 'aceite', name: 'Aceite de girasol' },
];

describe('normalización', () => {
  it('minúsculas, sin tildes ni puntuación', () => {
    expect(normalizeAlias('  Azúcar  Común!! ')).toBe('azucar comun');
    expect(normalizeAlias('Ñoquis')).toBe('noquis');
  });

  it('unifica unidades de ticket', () => {
    expect(normalizeAlias('LECHE CNP ENT 1L')).toBe('leche cnp ent 1l');
    expect(normalizeAlias('LECHE CNP ENT 1 LT')).toBe('leche cnp ent 1l');
    expect(normalizeAlias('Arroz 1 KG')).toBe('arroz 1kg');
    expect(normalizeAlias('Yerba 500 grs.')).toBe('yerba 500g');
    expect(normalizeAlias('Aceite 1,5 Litros')).toBe('aceite 1.5l');
    expect(normalizeAlias('Huevos x 12 UN')).toBe('huevos x 12u');
  });

  it('códigos de barras: solo dígitos, UPC-A pasa a EAN-13', () => {
    expect(normalizeBarcode('7 730 123 456 789')).toBe('7730123456789');
    expect(normalizeBarcode('012345678905')).toBe('0012345678905');
  });
});

describe('equivalencias', () => {
  it('un alias aprendido gana siempre', () => {
    const aliases = learnAlias([], 'receipt', 'LECHE CNP ENT 1L', 'leche');
    expect(resolveAlias('receipt', 'leche cnp ent 1 lt', aliases, products)).toEqual({
      product_id: 'leche', score: 1, via: 'alias',
    });
  });

  it('sin alias, usa el parecido con el nombre tolerando abreviaturas', () => {
    const m = resolveAlias('receipt', 'LECHE CNP ENT 1L', [], products);
    expect(m?.product_id).toBe('leche');
    expect(m?.via).toBe('name');
    expect(resolveAlias('receipt', 'LECHE DESC 1L', [], products)?.product_id).toBe('leche-d');
  });

  it('voz: plurales y frases', () => {
    expect(resolveAlias('voice', 'dos paquetes de fideos', [], products)?.product_id).toBe('fideos');
    expect(resolveAlias('voice', 'el aceite', [], products)?.product_id).toBe('aceite');
  });

  it('si no se parece a nada devuelve null (queda "sin identificar")', () => {
    expect(resolveAlias('receipt', 'BOLSA PLASTICO', [], products)).toBeNull();
  });

  it('códigos de barras solo por alias exacto', () => {
    const aliases = learnAlias([], 'barcode', '7730123456789', 'yerba');
    expect(resolveAlias('barcode', '7730123456789', aliases, products)?.product_id).toBe('yerba');
    expect(resolveAlias('barcode', '7730000000000', aliases, products)).toBeNull();
  });

  it('aprender suma usos y la corrección del usuario reemplaza', () => {
    let a: Alias[] = learnAlias([], 'receipt', 'FID TIRABUZON', 'fideos');
    a = learnAlias(a, 'receipt', 'fid tirabuzon', 'fideos');
    expect(a).toHaveLength(1);
    expect(a[0].hits).toBe(2);
    a = learnAlias(a, 'receipt', 'FID TIRABUZON', 'yerba');
    expect(a).toHaveLength(1);
    expect(a[0]).toMatchObject({ product_id: 'yerba', hits: 1 });
  });

  it('similitud', () => {
    expect(similarity('Fideos', 'fideos')).toBe(1);
    expect(similarity('arroz', 'fideos')).toBe(0);
  });
});

describe('búsqueda', () => {
  it('tolera tildes y busca por inicio de palabra', () => {
    const ps = [{ id: '1', name: 'Azúcar' }, { id: '2', name: 'Pan de azúcar' }, { id: '3', name: 'Arroz' }];
    expect(searchProducts('azu', ps).map((p) => p.id)).toEqual(['1', '2']);
    expect(searchProducts('', ps)).toEqual([]);
  });
});
