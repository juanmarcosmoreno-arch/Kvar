import { describe, expect, it } from 'vitest';
import { findExpiryDate } from '../expiryDate';

// «Hoy» en las pruebas: 15 de octubre de 2026
const NOW = new Date(2026, 9, 15, 10, 0);
const date = (text: string, monthFirst = false) => findExpiryDate(text, NOW, { monthFirst })?.date ?? null;

describe('findExpiryDate: formatos numéricos', () => {
  it('dd/mm/yy y dd/mm/yyyy', () => {
    expect(date('VTO 12/08/27')).toBe('2027-08-12');
    expect(date('VENCE: 03/11/2026')).toBe('2026-11-03');
  });

  it('dd.mm.yyyy y dd-mm-yy', () => {
    expect(date('MINDST HOLDBAR TIL 24.12.2026')).toBe('2026-12-24');
    expect(date('BÄST FÖRE 05-01-27')).toBe('2027-01-05');
  });

  it('dd/mm sin año: la próxima vez que llega', () => {
    expect(date('VTO 20/11')).toBe('2026-11-20');
    expect(date('VENC. 10/02')).toBe('2027-02-10');
  });

  it('mm/yy y mm/yyyy: último día del mes', () => {
    expect(date('VTO 08/27')).toBe('2027-08-31');
    expect(date('Consumir antes de 02/2028')).toBe('2028-02-29');
  });

  it('ISO y año.mes.día (Asia)', () => {
    expect(date('EXP 2027-03-15')).toBe('2027-03-15');
    expect(date('賞味期限 2027.03.15')).toBe('2027-03-15');
    expect(date('保质期至 2027年3月5日')).toBe('2027-03-05');
    expect(date('消費期限 27.03.15')).toBe('2027-03-15');
  });

  it('día primero, salvo en en-US', () => {
    expect(date('EXP 04/05/2027')).toBe('2027-05-04');
    expect(date('EXP 04/05/2027', true)).toBe('2027-04-05');
    // Si una de las dos lecturas es imposible, vale la otra
    expect(date('BEST BEFORE 12/25/2026')).toBe('2026-12-25');
    expect(date('USE BY 25/12/2026', true)).toBe('2026-12-25');
  });
});

describe('findExpiryDate: meses con nombre', () => {
  it('15 MAR 2027 y variantes', () => {
    expect(date('BEST BEFORE 15 MAR 2027')).toBe('2027-03-15');
    expect(date('EXP 15MAR27')).toBe('2027-03-15');
    expect(date('Consumir preferentemente antes del 15 de marzo de 2027')).toBe('2027-03-15');
    expect(date('À consommer de préférence avant le 3 févr. 2027')).toBe('2027-02-03');
    expect(date('Da consumarsi entro 7 GIU 2027')).toBe('2027-06-07');
  });

  it('MAR/27, MAR 2027, OUT/2027 (portugués)', () => {
    expect(date('BB MAR/27')).toBe('2027-03-31');
    expect(date('DLUO DEC 2026')).toBe('2026-12-31');
    expect(date('VAL: OUT/2027')).toBe('2027-10-31');
  });

  it('mes, día y año (EE. UU.)', () => {
    expect(date('BEST BY JAN 15, 2027')).toBe('2027-01-15');
  });
});

describe('findExpiryDate: varias fechas y ruido del OCR', () => {
  it('descarta la fecha de elaboración', () => {
    expect(date('ELAB 01/09/26 VTO 01/03/27')).toBe('2027-03-01');
    expect(date('VTO 01/03/27\nELAB 01/09/26')).toBe('2027-03-01');
    expect(date('MFG 2026-09-01 EXP 2028-09-01')).toBe('2028-09-01');
    expect(date('製造 2026.09.01 賞味期限 2027.09.01')).toBe('2027-09-01');
    expect(date('FAB: 10/2026')).toBeNull();
  });

  it('sin palabras clave, la más lejana en el futuro', () => {
    expect(date('01/09/26 01/03/27')).toBe('2027-03-01');
  });

  it('corrige O → 0 y similares', () => {
    expect(date('VTO:12/O8/26')).toBe('2026-08-12');
    expect(findExpiryDate('VTO:12/O8/26', NOW)?.raw).toBe('12/08/26');
    expect(date('EXP 2O27-O3-15')).toBe('2027-03-15');
    expect(date('VENCE 1S/11/2026')).toBe('2026-11-15');
  });

  it('ignora lotes y horas', () => {
    expect(date('L0T 2345 VENCE 03.11.2026')).toBe('2026-11-03');
    expect(date('LOTE 2611 14:35 VTO 30/06/2027')).toBe('2027-06-30');
    expect(date('12.08.26 14:35 L23045')).toBe('2026-08-12');
  });

  it('formas cortas solo al lado de una palabra de vencimiento', () => {
    expect(date('Peso neto 1.5 kg 12/08')).toBeNull();
    expect(date('Contiene 3/4 taza')).toBeNull();
  });

  it('rechaza fechas imposibles o demasiado lejanas', () => {
    expect(date('VTO 31/02/27')).toBeNull();
    expect(date('VTO 12/13/27')).toBe('2027-12-13'); // 13 no puede ser mes: se lee mes/día
    expect(date('EXP 2040-01-01')).toBeNull();
    expect(date('VTO 45/08/26')).toBeNull();
    expect(date('')).toBeNull();
    expect(date('Leche entera 1 L')).toBeNull();
  });

  it('un producto ya vencido devuelve la fecha pasada', () => {
    expect(date('VTO 10/09/26')).toBe('2026-09-10');
  });
});
