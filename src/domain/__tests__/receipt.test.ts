import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { learnAlias } from '../aliases';
import { cleanDescription, matchReceiptLine, packSizeOf, parseNumber, parseReceiptText, storeCodeKey } from '../receipt';

const ticket = readFileSync(resolve(__dirname, 'fixtures/ticket-macromercado.txt'), 'utf8');

describe('ticket de Macromercado', () => {
  const r = parseReceiptText(ticket);

  it('encuentra el súper, la fecha y todas las líneas', () => {
    expect(r.store).toBe('macromercado');
    expect(r.date).toBe('2026-10-01');
    expect(r.lines).toHaveLength(57);
    expect(r.ignored).toEqual(['BOLSONES MACROMERCADO', 'BOLSAS CAMISETA MACRO']);
  });

  it('la suma cierra con el total (control de lectura)', () => {
    expect(r.total).toBe(11851);
    expect(r.difference).toBe(0);
  });

  it('packs, peso y ofertas', () => {
    const leche = r.lines.find((l) => l.storeCode === '168953')!;
    expect(leche).toMatchObject({ quantity: 2, packSize: 4, units: 8, amount: 370.14, weighed: false });
    const pollo = r.lines.find((l) => l.storeCode === '70947')!;
    expect(pollo).toMatchObject({ quantity: 9.686, weighed: true, units: 1, amount: 1410.48 });
    expect(pollo.clean).toBe('Pollo con menudos');
    const arroz = r.lines.find((l) => l.storeCode === '25659')!;
    expect(arroz.promo).toBe(true);
    expect(arroz.clean).toBe('Arroz saman blanco 5 kg.');
    const panales = r.lines.find((l) => l.storeCode === '139634')!;
    expect(panales.units).toBe(26);
  });

  it('expande abreviaturas', () => {
    expect(cleanDescription('GALL. EL TRIGAL CON LECHE 190 GRS.')).toBe('Galletitas el trigal con leche 190 grs.');
    expect(cleanDescription('ADEREZO HELLMANN\'S ASADO S/GLUTEN 250GRS')).toBe("Aderezo hellmann's asado sin gluten 250grs");
    expect(cleanDescription('DESOD. REXONA M SPRAY')).toBe('Desodorante rexona m spray');
  });

  it('propone los productos del hogar y no confunde sabores con productos', () => {
    const products = ['Leche', 'Fideos', 'Harina', 'Yerba', 'Arroz', 'Azúcar', 'Yogur', 'Galletitas', 'Pañales', 'Lentejas']
      .map((name) => ({ id: name.toLowerCase(), name }));
    const match = (code: string) => {
      const line = r.lines.find((l) => l.storeCode === code)!;
      return matchReceiptLine(line, r.store, [], products)?.product_id ?? null;
    };
    expect(match('168953')).toBe('leche');
    expect(match('161846')).toBe('fideos');
    expect(match('41949')).toBe('harina');
    expect(match('66673')).toBe('yerba');
    expect(match('14972')).toBe('arroz');
    expect(match('120207')).toBe('azúcar'); // "CEFA AZUCAR": la marca propia no confunde
    expect(match('139634')).toBe('pañales');
    expect(match('148619')).toBe('lentejas');
    expect(match('78589')).toBe('galletitas'); // galletitas con leche ≠ leche
    expect(match('158660')).toBe('galletitas'); // galletitas de lentejas ≠ lentejas
    expect(match('85637')).toBeNull(); // nueces: no hay producto parecido → "sin identificar"
  });

  it('lo aprendido por código del súper gana siempre', () => {
    const line = r.lines.find((l) => l.storeCode === '26859')!; // GALL. EL TRIGAL MARIA
    const aliases = learnAlias([], 'receipt', storeCodeKey(r.store, line.storeCode)!, 'galletitas-maria');
    expect(matchReceiptLine(line, r.store, aliases, [])).toEqual({ product_id: 'galletitas-maria', score: 1, via: 'alias' });
  });
});

describe('utilidades', () => {
  it('números con coma decimal y punto de miles', () => {
    expect(parseNumber('1.410,48')).toBe(1410.48);
    expect(parseNumber('9,686')).toBe(9.686);
    expect(parseNumber('11.851,00')).toBe(11851);
    expect(parseNumber('-0,08')).toBe(-0.08);
  });

  it('tamaño de pack', () => {
    expect(packSizeOf('LECHE 1LT X 4')).toBe(4);
    expect(packSizeOf('MARIA RKA CHICA X3 300G')).toBe(3);
    expect(packSizeOf('HARINA 1 KG.')).toBe(1);
    expect(packSizeOf('QUESO X 500 GR')).toBe(1);
  });
});
