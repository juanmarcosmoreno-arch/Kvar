import { afterAll, describe, expect, it } from 'vitest';
import { setMessagesForTest, type Messages } from '..';
import { recipeCatalog } from '../../domain/recipeCatalog';
import { amountLabel, assessRecipe, ingredientLine, nameScore, parseIngredientLine } from '../../domain/recipes';
import { formatQuantity, findUnit } from '../../domain/units';
import { product } from '../../domain/__tests__/fixtures';
import { es } from '../es';
import { detectLang, LANGUAGES, type Lang } from '../languages';

const load = async (l: Lang): Promise<Messages> =>
  l === 'es' ? es : ((await import(`../${l}/index.ts`)) as { messages: Messages }).messages;

/** Recorre los textos: cada hoja es texto no vacío o una función que devuelve texto. */
function leaves(obj: unknown, path = ''): [string, unknown][] {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) return [[path, obj]];
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) => leaves(v, path ? `${path}.${k}` : k));
}

afterAll(() => setMessagesForTest(es, 'es'));

describe('idiomas', () => {
  it('elige el idioma del teléfono', () => {
    expect(detectLang(['pt-PT', 'en'])).toBe('pt');
    expect(detectLang(['zh-Hant-TW'])).toBe('zh');
    expect(detectLang(['nb-NO'])).toBe('da');
    expect(detectLang(['de-DE', 'ja-JP'])).toBe('ja');
    expect(detectLang(['de-DE'])).toBe('en');
    expect(detectLang([])).toBe('es');
  });

  for (const { code } of LANGUAGES) {
    it(`${code}: mismas claves que el español y ningún texto vacío`, async () => {
      const msgs = await load(code);
      setMessagesForTest(msgs, code);
      const keys = (x: unknown) => leaves(x).map(([k]) => k.replace(/\.\d+$/, '')).filter((k) => !k.startsWith('catalog'));
      expect(new Set(keys(msgs))).toEqual(new Set(keys(es)));
      for (const [k, v] of leaves(msgs)) {
        if (k.startsWith('catalog')) continue;
        if (typeof v === 'function') {
          const out = (v as (...a: unknown[]) => unknown)(...Array.from({ length: v.length }, (_, i) => (i === 0 ? 2 : 'x')));
          expect(out, k).toBeTruthy();
        } else if (typeof v === 'string') {
          // «u» (unidad) no se muestra; las partes de una oración partida pueden quedar vacías según el idioma
          if (!/\.u$|(before|after|middle|Before|After)$/.test(k)) expect(v.trim(), k).not.toBe('');
        }
      }
      // El recetario completo en ese idioma
      const recipes = recipeCatalog();
      expect(recipes.length).toBeGreaterThan(25);
      for (const r of recipes) for (const i of r.ingredients) expect(i.name, `${code} ${r.title}`).toBeTruthy();
      if (code !== 'es') expect(recipes.find((r) => r.id === 'catalog:fideos-con-tuco')!.title).not.toBe('Fideos con tuco');
    });
  }
});

describe('recetas en otros idiomas', () => {
  it('inglés: entiende y escribe ingredientes, y cruza con productos en inglés', async () => {
    setMessagesForTest(await load('en'), 'en');
    expect(parseIngredientLine('2 cups of milk')).toMatchObject({ name: 'milk', quantity: 2, unit: 'taza' });
    expect(parseIngredientLine('1 tbsp olive oil')).toMatchObject({ name: 'olive oil', quantity: 1, unit: 'cda' });
    expect(parseIngredientLine('salt to taste')).toMatchObject({ name: 'salt', amount: 'a gusto' });
    expect(parseIngredientLine('parmesan (optional)')).toMatchObject({ name: 'parmesan', optional: true });
    expect(amountLabel({ name: 'milk', quantity: 1.5, unit: 'taza', amount: null })).toBe('1 ½ cups');
    expect(ingredientLine({ name: 'salt', quantity: null, unit: null, amount: 'a gusto', optional: false })).toBe('salt to taste');
    expect(nameScore('tomatoes', 'Tomato')).toBe(3);
    const tuco = recipeCatalog().find((r) => r.id === 'catalog:fideos-con-tuco')!;
    const s = assessRecipe(tuco, [product({ name: 'Pasta' }), product({ name: 'Onions' }), product({ name: 'Crushed tomatoes' })], 2);
    expect(s.lines.filter((l) => l.product).map((l) => l.product!.name)).toEqual(expect.arrayContaining(['Pasta', 'Onions', 'Crushed tomatoes']));
    expect(formatQuantity(3, 'latas')).toBe('3 cans');
    expect(findUnit('cans').key).toBe('latas');
  });

  it('chino y japonés: sin espacios entre palabras', async () => {
    setMessagesForTest(await load('zh'), 'zh');
    expect(nameScore('牛奶', '全脂牛奶')).toBe(2);
    expect(parseIngredientLine('2杯牛奶')).toMatchObject({ name: '牛奶', quantity: 2, unit: 'taza' });
    expect(parseIngredientLine('盐 适量')).toMatchObject({ name: '盐', amount: 'a gusto' });
    setMessagesForTest(await load('ja'), 'ja');
    expect(parseIngredientLine('大さじ2 醤油')).toMatchObject({ name: '醤油', quantity: 2, unit: 'cda' });
    expect(parseIngredientLine('卵 2個')).toBeTruthy();
    expect(formatQuantity(3, 'latas')).toBe('3 缶');
  });
});
