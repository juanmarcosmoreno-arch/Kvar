import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { learnAlias } from '../aliases';
import { cleanDescription, matchReceiptLine, packSizeOf, parseNumber, parseReceiptText, storeCodeKey } from '../receipt';

const ticket = readFileSync(resolve(__dirname, '../../assets/demo/ticket-macromercado.txt'), 'utf8');

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

/** Ticket real de Disco Fresh Market (Solymar), como lo arma el lector de fotos: un producto en dos renglones */
const DISCO = `en tus productos favoritos
FRESH MARKET
Disco
Supermercados Disco del Uruguay S.A. LOCAL
Rut: 210274130017
Avda. Giannattasio Km. 23.500 18
Solymar - Canelones
Teléfonos: 26956892 - 26965140
e-Ticket
BJ7729049 17/10/2026
CONTADO
CONSUMO FINAL
MONEDA: UYU
AGUJA SIN HUESO 422.36
1.324 KG x 319.00
BONDIOLA ENTER MEDIA 248.83
1.670 KG x 149.00
PANAL BABYSEC PREMIU 949.00
1.000 UN x 949.00
TOTAL: $ 1620.19
Tarjeta Credito/Debito $ 1620.19
Pago total $ 1620.19
CAMBIO $ 0.00
ADENDA
VT:33589
Más
JUAN MORENO ****8101
Tarjeta MAS 0
Puntaje del Ticket 248
Saldo de la cuenta
Gracias: JUAN MORENO
Cajera [101802654]: ANY
N° Trans Fecha Hora Caja
2101219 17/10/2026 16:53:23 005
CI Titular 8101
FIN ADENDA
Cod. de Seguridad: 2tjth2
Res. DGI 2379/2012`;

describe('ticket de Disco en dos renglones', () => {
  const expectDisco = (r: ReturnType<typeof parseReceiptText>) => {
    expect(r.lines.map((l) => [l.description, l.quantity, l.unitPrice, l.amount, l.weighed, l.units])).toEqual([
      ['AGUJA SIN HUESO', 1.324, 319, 422.36, true, 1],
      ['BONDIOLA ENTER MEDIA', 1.67, 149, 248.83, true, 1],
      ['PANAL BABYSEC PREMIU', 1, 949, 949, false, 1],
    ]);
    expect(r.total).toBe(1620.19);
    expect(r.difference).toBe(0);
  };

  it('lee los productos, el súper, la fecha y el total', () => {
    const r = parseReceiptText(DISCO);
    expect(r.store).toBe('disco');
    expect(r.date).toBe('2026-10-17');
    expectDisco(r);
    expect(r.lines[0].clean).toBe('Aguja sin hueso');
  });

  it('aunque el OCR pegue el monto al renglón de la cantidad (foto curvada)', () => {
    const curved = DISCO.replace('AGUJA SIN HUESO 422.36\n1.324 KG x 319.00', 'AGUJA SIN HUESO\n1.324 KG x 319.00 422.36')
      .replace('PANAL BABYSEC PREMIU 949.00\n1.000 UN x 949.00', 'PANAL BABYSEC PREMIU\n1.000 UN x 949.00 949.00');
    expectDisco(parseReceiptText(curved));
  });

  it('aunque el OCR junte los dos renglones en uno', () => {
    expectDisco(parseReceiptText(DISCO.replace('AGUJA SIN HUESO 422.36\n1.324 KG x 319.00', 'AGUJA SIN HUESO 1.324 KG x 319.00 422.36')));
  });

  it('con la cantidad arriba de la descripción', () => {
    const reversed = DISCO.replace('AGUJA SIN HUESO 422.36\n1.324 KG x 319.00', '1.324 KG x 319.00\nAGUJA SIN HUESO 422.36')
      .replace('BONDIOLA ENTER MEDIA 248.83\n1.670 KG x 149.00', '1.670 KG x 149.00\nBONDIOLA ENTER MEDIA 248.83')
      .replace('PANAL BABYSEC PREMIU 949.00\n1.000 UN x 949.00', '1.000 UN x 949.00\nPANAL BABYSEC PREMIU 949.00');
    expectDisco(parseReceiptText(reversed));
  });

  it('con coma decimal y un número mal leído igual arma el producto (y avisa la diferencia)', () => {
    const r = parseReceiptText(DISCO.replace('1.670 KG x 149.00', '1,670 KG x 149,00').replace('PANAL BABYSEC PREMIU 949.00', 'PANAL BABYSEC PREMIU 943.00'));
    expect(r.lines).toHaveLength(3);
    expect(r.lines[1].quantity).toBe(1.67);
    expect(r.difference).toBe(-6);
  });

  it('un descuento se resta del producto de arriba', () => {
    const r = parseReceiptText(DISCO.replace('1.000 UN x 949.00', '1.000 UN x 949.00\nDESC. TARJETA -94.90').replace('TOTAL: $ 1620.19', 'TOTAL: $ 1525.29'));
    const panal = r.lines.find((l) => l.description.startsWith('PANAL'))!;
    expect(panal.amount).toBe(854.1);
    expect(panal.promo).toBe(true);
    expect(r.difference).toBe(0);
  });

  it('SUBTOTAL no es el total', () => {
    const r = parseReceiptText(DISCO.replace('TOTAL: $ 1620.19', 'SUBTOTAL 1620.19\nTOTAL: $ 1620.19'));
    expect(r.total).toBe(1620.19);
    expect(r.lines).toHaveLength(3);
  });

  it('el súper es la marca de arriba, no la razón social', () => {
    expect(parseReceiptText(`DEVOTO\nSupermercados Disco del Uruguay S.A.\n${DISCO.split('MONEDA: UYU')[1]}`).store).toBe('devoto');
    expect(parseReceiptText(`Géant\nSupermercados Disco del Uruguay S.A.\nTOTAL 10,00`).store).toBe('geant');
  });
});

describe('ticket de Disco con el monto suelto', () => {
  it('el monto en su propio renglón se pega a la descripción o a la cantidad', () => {
    const r = parseReceiptText(DISCO
      .replace('AGUJA SIN HUESO 422.36\n1.324 KG x 319.00', 'AGUJA SIN HUESO\n422.36\n1.324 KG x 319.00')
      .replace('BONDIOLA ENTER MEDIA 248.83\n1.670 KG x 149.00', 'BONDIOLA ENTER MEDIA\n1.670 KG x 149.00\n248.83'));
    expect(r.lines.map((l) => l.amount)).toEqual([422.36, 248.83, 949]);
    expect(r.difference).toBe(0);
  });
});
