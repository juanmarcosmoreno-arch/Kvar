import { describe, expect, it } from 'vitest';
import { kindFromModel, parseVoice, resolveVoice, splitQuantity } from '../voice';

describe('voz sin IA (respaldo)', () => {
  it('compré varias cosas con cantidades', () => {
    expect(parseVoice('Compré leche, dos paquetes de fideos y yerba')).toEqual([
      { kind: 'bought', product: 'leche', quantity: 1 },
      { kind: 'bought', product: 'fideos', quantity: 2 },
      { kind: 'bought', product: 'yerba', quantity: 1 },
    ]);
  });

  it('se terminó / queda poco / pregunta / a la lista', () => {
    expect(parseVoice('Se terminó el aceite')).toEqual([{ kind: 'out', product: 'aceite', quantity: 1 }]);
    expect(parseVoice('Queda poco café')).toEqual([{ kind: 'low', product: 'cafe', quantity: 1 }]);
    expect(parseVoice('¿Hay arroz?')).toEqual([{ kind: 'ask', product: 'arroz', quantity: 1 }]);
    expect(parseVoice('Agregá papel higiénico a la lista')).toEqual([{ kind: 'list', product: 'papel higienico', quantity: 1 }]);
  });

  it('dos acciones en la misma frase', () => {
    expect(parseVoice('Compré tres latas de atún y se terminó la sal')).toEqual([
      { kind: 'bought', product: 'atun', quantity: 3 },
      { kind: 'out', product: 'sal', quantity: 1 },
    ]);
  });

  it('varias oraciones, con pregunta al final', () => {
    expect(parseVoice('Compré leche y dos paquetes de fideos, se terminó el aceite y queda poco café. ¿Hay arroz?')).toEqual([
      { kind: 'bought', product: 'leche', quantity: 1 },
      { kind: 'bought', product: 'fideos', quantity: 2 },
      { kind: 'out', product: 'aceite', quantity: 1 },
      { kind: 'low', product: 'cafe', quantity: 1 },
      { kind: 'ask', product: 'arroz', quantity: 1 },
    ]);
  });

  it('el producto antes del verbo', () => {
    expect(parseVoice('El aceite se terminó')).toEqual([{ kind: 'out', product: 'aceite', quantity: 1 }]);
    expect(parseVoice('Hay que comprar pan')).toEqual([{ kind: 'list', product: 'pan', quantity: 1 }]);
  });

  it('cantidades', () => {
    expect(splitQuantity('media docena de huevos')).toEqual({ quantity: 6, product: 'huevos' });
    expect(splitQuantity('12 pañales')).toEqual({ quantity: 12, product: 'panales' });
    expect(splitQuantity('una botella de vino')).toEqual({ quantity: 1, product: 'vino' });
  });
});

describe('Apple Intelligence → acciones', () => {
  it('entiende los tipos en español', () => {
    expect(kindFromModel('compre')).toBe('bought');
    expect(kindFromModel('se_termino')).toBe('out');
    expect(kindFromModel('queda_poco')).toBe('low');
    expect(kindFromModel('pregunta')).toBe('ask');
    expect(kindFromModel('agregar_lista')).toBe('list');
    expect(kindFromModel('cualquier cosa')).toBeNull();
  });

  it('empareja con los productos del hogar', () => {
    const products = [{ id: 'p1', name: 'Fideos' }, { id: 'p2', name: 'Papel higiénico' }, { id: 'p3', name: 'Yerba' }];
    const r = resolveVoice(parseVoice('Compré fideos, papel higienico y queso'), [], products);
    expect(r.map((a) => a.productId)).toEqual(['p1', 'p2', null]); // queso es nuevo
    const ask = resolveVoice(parseVoice('¿Hay yerba?'), [], products);
    expect(ask[0]).toMatchObject({ kind: 'ask', productId: 'p3' });
  });
});
