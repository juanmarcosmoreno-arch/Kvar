import { describe, expect, it } from 'vitest';
import { genericName, guessCategory, guessLocation, parseOffResponse, proposeName } from '../openFoodFacts';

const cats = ['Frutas y verduras', 'Panadería', 'Carnes y pescados', 'Lácteos y huevos', 'Almacén', 'Congelados', 'Bebidas', 'Limpieza', 'Higiene', 'Bebé', 'Mascotas', 'Otros']
  .map((name, i) => ({ id: `c${i}`, name }));
const locs = ['Heladera', 'Freezer', 'Alacena', 'Baño', 'Limpieza'].map((name, i) => ({ id: `l${i}`, name }));

const arrozGallo = {
  status: 1,
  product: {
    brands: 'Gallo',
    categories_tags: ['en:plant-based-foods-and-beverages', 'en:cereals-and-potatoes', 'en:cereal-grains', 'en:rices', 'en:precooked-rices'],
    product_name: 'Oro',
    product_name_es: 'Oro',
    quantity: '1 kg',
    image_front_small_url: 'https://images.openfoodfacts.org/x.jpg',
  },
};

describe('Open Food Facts', () => {
  it('arma un nombre útil cuando OFF solo trae la marca comercial', () => {
    const p = parseOffResponse('7790070411716', arrozGallo)!;
    expect(p.name).toBe('Arroz Gallo Oro');
    expect(p.brand).toBe('Gallo');
    expect(p.generic).toBe('Arroz');
    expect(p.quantity).toBe('1 kg');
  });

  it('no repite la marca ni el genérico si ya están en el nombre', () => {
    expect(proposeName('Nutella', 'Nutella', null)).toBe('Nutella');
    expect(proposeName('Leche entera', 'Conaprole', 'Leche')).toBe('Conaprole Leche entera');
    expect(proposeName('Yerba Canarias', 'Canarias', 'Yerba')).toBe('Yerba Canarias');
  });

  it('producto no encontrado', () => {
    expect(parseOffResponse('7730205003019', { status: 0 })).toBeNull();
    expect(parseOffResponse('1', { status: 1, product: {} })).toBeNull();
  });

  it('genérico desde la etiqueta más específica', () => {
    expect(genericName(['plant-based-foods', 'pastas', 'spaghetti'])).toBe('Fideos');
    expect(genericName(['dairies', 'milks', 'whole-milks'])).toBe('Leche');
    expect(genericName(['spreads', 'sweet-spreads'])).toBeNull();
  });

  it('adivina categoría y lugar del hogar', () => {
    const lacteo = guessCategory(['dairies', 'milks'], cats);
    expect(lacteo?.name).toBe('Lácteos y huevos');
    expect(guessLocation(lacteo!.name, locs)?.name).toBe('Heladera');
    const arroz = guessCategory(['cereals-and-potatoes', 'rices'], cats);
    expect(arroz?.name).toBe('Almacén');
    expect(guessLocation(arroz!.name, locs)?.name).toBe('Alacena');
    const helado = guessCategory(['desserts', 'frozen-desserts', 'ice-creams'], cats);
    expect(helado?.name).toBe('Congelados');
    expect(guessLocation(helado!.name, locs)?.name).toBe('Freezer');
  });

  it('si el hogar no tiene una categoría parecida, no inventa', () => {
    expect(guessCategory(['dairies'], [{ id: 'x', name: 'Cosas' }])).toBeNull();
  });
});

describe('categoría por el nombre (tickets)', () => {
  it('adivina la categoría de líneas reales del ticket', async () => {
    const { guessCategoryFromName } = await import('../openFoodFacts');
    const g = (n: string) => guessCategoryFromName(n, cats)?.name ?? null;
    expect(g('Agua lavandina m max')).toBe('Limpieza');
    expect(g('Yogur conaprole biotop vainilla')).toBe('Lácteos y huevos');
    expect(g('Pollo con menudos')).toBe('Carnes y pescados');
    expect(g('Galletitas el trigal con leche')).toBe('Almacén'); // son galletitas, no leche
    expect(g('Leche clady ultra entera')).toBe('Lácteos y huevos');
    expect(g('Champu dove hidrat')).toBe('Higiene');
    expect(g('Pañales bummis pants xg')).toBe('Bebé');
    expect(g('Cefa pasas de uva sultaninas')).toBe('Almacén');
    expect(g('Vino ariano rosado dulce')).toBe('Bebidas');
    expect(g('Agua salus 2 l')).toBe('Bebidas');
    expect(g('Cosa rara')).toBeNull();
  });
});
