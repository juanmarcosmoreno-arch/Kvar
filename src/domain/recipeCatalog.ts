/**
 * Recetas que trae Stoka: comida casera de todos los días. Viven en la app (no en la base),
 * funcionan sin conexión y las recetas propias del hogar tienen prioridad sobre ellas.
 * Los ingredientes se escriben como los escribiría cualquiera y se interpretan con parseIngredientLine.
 */
import { lang, m } from '../i18n';
import { parseIngredientLine } from './recipes';
import type { MealType, Recipe, RecipeConstraint } from './types';

interface Def {
  key: string;
  title: string;
  servings: number;
  minutes: number;
  meals: MealType[];
  constraints?: RecipeConstraint[];
  tags: string[];
  ingredients: string[];
  steps: string[];
}

const DEFS: Def[] = [
  {
    key: 'fideos-con-tuco', title: 'Fideos con tuco', servings: 4, minutes: 35, meals: ['almuerzo', 'cena'],
    constraints: ['sin_horno'], tags: ['pasta'],
    ingredients: ['400 g de fideos', '1 lata de tomate triturado', '1 cebolla', '1 diente de ajo', '2 cdas de aceite', 'sal a gusto', 'queso rallado (opcional)'],
    steps: ['Picá la cebolla y el ajo y rehogalos en el aceite.', 'Sumá el tomate, salá y cociná 15 minutos a fuego bajo.', 'Herví los fideos en agua con sal, colalos y servilos con el tuco.'],
  },
  {
    key: 'fideos-manteca-queso', title: 'Fideos con manteca y queso', servings: 4, minutes: 15, meals: ['almuerzo', 'cena'],
    constraints: ['sin_horno', 'una_olla'], tags: ['pasta', 'rapido'],
    ingredients: ['400 g de fideos', '50 g de manteca', '60 g de queso rallado', 'sal a gusto'],
    steps: ['Herví los fideos en agua con sal.', 'Colalos y mezclalos en la misma olla con la manteca y el queso.'],
  },
  {
    key: 'fideos-atun', title: 'Fideos con atún y tomate', servings: 4, minutes: 25, meals: ['almuerzo', 'cena'],
    constraints: ['sin_horno'], tags: ['pasta', 'pescado'],
    ingredients: ['400 g de fideos', '1 lata de atún', '1 lata de tomate triturado', '1 cebolla', '1 diente de ajo', '2 cdas de aceite', 'sal a gusto'],
    steps: ['Rehogá la cebolla y el ajo picados en el aceite.', 'Sumá el tomate y cociná 10 minutos; agregá el atún escurrido.', 'Mezclá con los fideos recién hervidos.'],
  },
  {
    key: 'arroz-con-pollo', title: 'Arroz con pollo', servings: 4, minutes: 45, meals: ['almuerzo', 'cena'],
    constraints: ['sin_horno', 'una_olla'], tags: ['arroz', 'pollo'],
    ingredients: ['2 tazas de arroz', '500 g de pollo', '1 cebolla', '1 morrón', '1 zanahoria', '1 cubo de caldo', '2 cdas de aceite', 'azafrán (opcional)', 'sal a gusto'],
    steps: ['Dorá el pollo en trozos con el aceite.', 'Sumá la cebolla, el morrón y la zanahoria picados.', 'Agregá el arroz, 4 tazas de agua caliente y el caldo. Cociná tapado 18 minutos.'],
  },
  {
    key: 'arroz-salteado', title: 'Arroz salteado con verduras', servings: 2, minutes: 25, meals: ['almuerzo', 'cena', 'vianda'],
    constraints: ['sin_horno'], tags: ['arroz', 'verduras'],
    ingredients: ['1 taza de arroz', '1 zanahoria', '1 morrón', '1 zapallito', '2 huevos', '2 cdas de salsa de soja', '1 cda de aceite'],
    steps: ['Herví el arroz y dejalo enfriar un poco.', 'Salteá las verduras en tiras con el aceite, a fuego fuerte.', 'Sumá los huevos revueltos, el arroz y la salsa de soja.'],
  },
  {
    key: 'ensalada-de-arroz', title: 'Ensalada de arroz', servings: 2, minutes: 25, meals: ['almuerzo', 'vianda'],
    constraints: ['sin_horno'], tags: ['arroz', 'ensalada', 'pescado'],
    ingredients: ['1 taza de arroz', '1 lata de atún', '1 lata de choclo', '2 huevos', '1 tomate', '2 cdas de mayonesa', 'sal a gusto'],
    steps: ['Herví el arroz y los huevos (10 minutos).', 'Mezclá con el atún, el choclo, el tomate en cubos y los huevos picados.', 'Condimentá con la mayonesa.'],
  },
  {
    key: 'tortilla-de-papas', title: 'Tortilla de papas', servings: 4, minutes: 40, meals: ['almuerzo', 'cena', 'vianda'],
    constraints: ['sin_horno', 'una_olla'], tags: ['huevo', 'papa'],
    ingredients: ['4 papas', '5 huevos', '1 cebolla', '½ taza de aceite', 'sal a gusto'],
    steps: ['Cortá las papas en láminas finas y cocinalas en el aceite a fuego medio con la cebolla.', 'Escurrilas y mezclalas con los huevos batidos y sal.', 'Cociná en la sartén 5 minutos de cada lado (dala vuelta con un plato).'],
  },
  {
    key: 'revuelto-gramajo', title: 'Revuelto gramajo', servings: 3, minutes: 30, meals: ['almuerzo', 'cena'],
    constraints: ['sin_horno', 'una_olla'], tags: ['huevo', 'papa'],
    ingredients: ['3 papas', '4 huevos', '150 g de jamón', '1 cebolla', '1 lata de arvejas (opcional)', '3 cdas de aceite', 'sal a gusto'],
    steps: ['Cortá las papas en bastones finos y freílas.', 'En la sartén, rehogá la cebolla y el jamón en tiras.', 'Sumá las papas y los huevos batidos y revolvé hasta que cuajen.'],
  },
  {
    key: 'omelette-de-queso', title: 'Omelette de queso', servings: 1, minutes: 10, meals: ['cena'],
    constraints: ['sin_horno', 'una_olla'], tags: ['huevo', 'rapido'],
    ingredients: ['2 huevos', '30 g de queso', '1 cdita de manteca', 'sal a gusto'],
    steps: ['Batí los huevos con sal.', 'Volcalos en la sartén con la manteca y, cuando estén casi listos, sumá el queso y doblá.'],
  },
  {
    key: 'huevos-revueltos-tostadas', title: 'Huevos revueltos con tostadas', servings: 2, minutes: 10, meals: ['cena'],
    constraints: ['sin_horno', 'una_olla'], tags: ['huevo', 'rapido'],
    ingredients: ['4 huevos', '4 rebanadas de pan', '20 g de manteca', 'sal a gusto'],
    steps: ['Tostá el pan.', 'Revolvé los huevos con la manteca a fuego bajo, sin dejar de mover, hasta que estén cremosos.'],
  },
  {
    key: 'tostado-jamon-queso', title: 'Tostado de jamón y queso', servings: 2, minutes: 10, meals: ['cena'],
    constraints: ['sin_horno'], tags: ['sandwich', 'rapido'],
    ingredients: ['4 rebanadas de pan', '4 fetas de jamón', '4 fetas de queso', '10 g de manteca'],
    steps: ['Armá los sándwiches y untá el pan por fuera con manteca.', 'Tostalos en la sartén o la sandwichera hasta que el queso se derrita.'],
  },
  {
    key: 'milanesas-con-pure', title: 'Milanesas con puré', servings: 4, minutes: 40, meals: ['almuerzo', 'cena'],
    constraints: ['sin_horno'], tags: ['carne', 'papa'],
    ingredients: ['4 milanesas', '1 kg de papas', '30 g de manteca', '½ taza de leche', 'aceite para freír', 'sal a gusto'],
    steps: ['Herví las papas peladas hasta que estén tiernas; pisalas con la manteca, la leche y sal.', 'Freí o cociná las milanesas a la plancha.'],
  },
  {
    key: 'milanesa-napolitana', title: 'Milanesas a la napolitana', servings: 4, minutes: 40, meals: ['almuerzo', 'cena'],
    tags: ['carne', 'horno'],
    ingredients: ['4 milanesas', '1 lata de tomate triturado', '200 g de muzzarella', '4 fetas de jamón', 'orégano a gusto'],
    steps: ['Cociná las milanesas.', 'Cubrilas con tomate, jamón y muzzarella, y orégano.', 'Gratinalas en el horno 10 minutos.'],
  },
  {
    key: 'hamburguesas-caseras', title: 'Hamburguesas caseras', servings: 4, minutes: 25, meals: ['almuerzo', 'cena'],
    constraints: ['sin_horno'], tags: ['carne'],
    ingredients: ['500 g de carne picada', '1 huevo', '4 panes de hamburguesa', '1 tomate', 'lechuga (opcional)', 'sal a gusto'],
    steps: ['Mezclá la carne con el huevo y sal; armá 4 medallones.', 'Cocinalos a la plancha 4 minutos de cada lado.', 'Armá con el pan, tomate y lechuga.'],
  },
  {
    key: 'guiso-de-lentejas', title: 'Guiso de lentejas', servings: 4, minutes: 60, meals: ['almuerzo', 'cena', 'vianda'],
    constraints: ['sin_horno', 'una_olla'], tags: ['guiso', 'legumbres'],
    ingredients: ['300 g de lentejas', '200 g de chorizo', '1 cebolla', '1 morrón', '2 papas', '1 zanahoria', '1 lata de tomate triturado', 'pimentón a gusto', 'sal a gusto'],
    steps: ['Rehogá la cebolla, el morrón y el chorizo en rodajas.', 'Sumá el tomate, las papas y la zanahoria en cubos y las lentejas.', 'Cubrí con agua y cociná 40 minutos, revolviendo de vez en cuando.'],
  },
  {
    key: 'sopa-de-verduras', title: 'Sopa de verduras', servings: 4, minutes: 45, meals: ['almuerzo', 'cena'],
    constraints: ['sin_horno', 'una_olla'], tags: ['sopa', 'verduras'],
    ingredients: ['2 papas', '2 zanahorias', '300 g de zapallo', '1 cebolla', '1 puerro', '100 g de fideos para sopa (opcional)', 'sal a gusto'],
    steps: ['Cortá todo en cubos chicos.', 'Cociná en 2 litros de agua con sal 30 minutos.', 'Si querés, sumá los fideos los últimos 8 minutos.'],
  },
  {
    key: 'polenta-con-tuco', title: 'Polenta con tuco y queso', servings: 4, minutes: 30, meals: ['almuerzo', 'cena'],
    constraints: ['sin_horno'], tags: ['polenta'],
    ingredients: ['300 g de polenta', '1 lata de tomate triturado', '1 cebolla', '100 g de queso', '2 cdas de aceite', 'sal a gusto'],
    steps: ['Prepará un tuco con la cebolla, el aceite y el tomate (15 minutos).', 'Herví 1,2 litros de agua con sal, echá la polenta en lluvia y revolvé 5 minutos.', 'Serví con el tuco y el queso.'],
  },
  {
    key: 'zapallitos-rellenos', title: 'Zapallitos rellenos', servings: 4, minutes: 50, meals: ['almuerzo', 'cena'],
    tags: ['verduras', 'carne', 'horno'],
    ingredients: ['6 zapallitos', '300 g de carne picada', '1 cebolla', '1 huevo', '50 g de queso rallado', 'sal a gusto'],
    steps: ['Herví los zapallitos 8 minutos, cortalos al medio y vacialos.', 'Rehogá la cebolla con la carne y mezclá con la pulpa, el huevo y sal.', 'Rellenalos, cubrí con queso y horneá 20 minutos.'],
  },
  {
    key: 'pastel-de-carne', title: 'Pastel de carne', servings: 4, minutes: 60, meals: ['almuerzo', 'cena', 'vianda'],
    tags: ['carne', 'papa', 'horno'],
    ingredients: ['1 kg de papas', '500 g de carne picada', '1 cebolla', '1 morrón', '2 huevos', '30 g de manteca', '½ taza de leche', 'aceitunas (opcional)', 'sal a gusto'],
    steps: ['Hacé un puré con las papas, la manteca y la leche.', 'Rehogá la cebolla y el morrón con la carne; sumá los huevos duros picados y las aceitunas.', 'En una fuente: carne abajo, puré arriba. Gratiná 20 minutos.'],
  },
  {
    key: 'carne-al-horno-papas', title: 'Carne al horno con papas', servings: 4, minutes: 75, meals: ['almuerzo'],
    tags: ['carne', 'papa', 'horno'],
    ingredients: ['1 kg de carne para horno', '1 kg de papas', '1 cebolla', '3 cdas de aceite', 'sal a gusto'],
    steps: ['Salá la carne y ponela en una asadera con las papas y la cebolla en gajos y el aceite.', 'Horneá a 200 °C unos 60 minutos, dando vuelta a mitad de cocción.'],
  },
  {
    key: 'pollo-al-horno-boniatos', title: 'Pollo al horno con boniatos', servings: 4, minutes: 60, meals: ['almuerzo', 'cena'],
    tags: ['pollo', 'horno'],
    ingredients: ['1 kg de pollo', '3 boniatos', '1 cebolla', '3 cdas de aceite', 'sal a gusto'],
    steps: ['Acomodá el pollo y los boniatos en cubos en una asadera con la cebolla y el aceite.', 'Horneá a 200 °C 50 minutos.'],
  },
  {
    key: 'pollo-plancha-ensalada', title: 'Pollo a la plancha con ensalada', servings: 2, minutes: 20, meals: ['almuerzo', 'cena', 'vianda'],
    constraints: ['sin_horno', 'una_olla'], tags: ['pollo', 'ensalada', 'rapido'],
    ingredients: ['400 g de pollo', '1 lechuga', '2 tomates', '1 limón (opcional)', '2 cdas de aceite', 'sal a gusto'],
    steps: ['Cociná el pollo fileteado a la plancha 4 minutos de cada lado.', 'Serví con la lechuga y el tomate condimentados con aceite, sal y limón.'],
  },
  {
    key: 'ensalada-de-atun', title: 'Ensalada de atún', servings: 2, minutes: 15, meals: ['almuerzo', 'vianda'],
    constraints: ['sin_horno', 'una_olla'], tags: ['ensalada', 'pescado', 'rapido'],
    ingredients: ['1 lata de atún', '2 tomates', '1 lechuga', '2 huevos', '2 cdas de aceite', 'sal a gusto'],
    steps: ['Herví los huevos 10 minutos.', 'Mezclá la lechuga, el tomate, el atún y los huevos en cuartos; condimentá.'],
  },
  {
    key: 'bunuelos-de-acelga', title: 'Buñuelos de acelga', servings: 4, minutes: 30, meals: ['almuerzo', 'cena'],
    constraints: ['sin_horno'], tags: ['verduras', 'frito'],
    ingredients: ['1 atado de acelga', '2 huevos', '150 g de harina', '½ taza de leche', 'aceite para freír', 'sal a gusto'],
    steps: ['Hervi la acelga 3 minutos, escurrila bien y picala.', 'Mezclá con los huevos, la harina, la leche y sal.', 'Freí cucharadas de la mezcla hasta que estén doradas.'],
  },
  {
    key: 'tarta-jamon-queso', title: 'Tarta de jamón y queso', servings: 4, minutes: 45, meals: ['almuerzo', 'cena', 'vianda'],
    tags: ['tarta', 'horno'],
    ingredients: ['1 paquete de tapas de tarta', '200 g de jamón', '200 g de queso', '3 huevos', '½ taza de leche', 'sal a gusto'],
    steps: ['Forrá una tartera con una tapa.', 'Mezclá el jamón y el queso en cubos con los huevos batidos y la leche.', 'Cubrí con la otra tapa y horneá 30 minutos a 180 °C.'],
  },
  {
    key: 'pizza-casera', title: 'Pizza casera', servings: 4, minutes: 70, meals: ['cena'],
    tags: ['pizza', 'horno'],
    ingredients: ['500 g de harina', '1 sobre de levadura', '1 lata de tomate triturado', '300 g de muzzarella', '3 cdas de aceite', 'orégano a gusto', 'sal a gusto'],
    steps: ['Mezclá la harina, la levadura, sal, el aceite y 300 ml de agua tibia; amasá y dejá levar 40 minutos.', 'Estirá en una asadera y precociná 10 minutos.', 'Cubrí con tomate y muzzarella y gratiná.'],
  },
  {
    key: 'noquis-de-papa', title: 'Ñoquis de papa', servings: 4, minutes: 60, meals: ['almuerzo'],
    constraints: ['sin_horno'], tags: ['pasta', 'papa'],
    ingredients: ['1 kg de papas', '300 g de harina', '1 huevo', '1 lata de tomate triturado', '1 cebolla', 'sal a gusto', 'queso rallado (opcional)'],
    steps: ['Herví las papas con cáscara, pelalas y hacelas puré.', 'Sumá el huevo, sal y la harina de a poco; cortá los ñoquis.', 'Herví hasta que suban y serví con un tuco de tomate y cebolla.'],
  },
  {
    key: 'panqueques-dulce-de-leche', title: 'Panqueques con dulce de leche', servings: 4, minutes: 30, meals: ['dulce'],
    constraints: ['sin_horno', 'una_olla'], tags: ['dulce'],
    ingredients: ['2 huevos', '1 taza de harina', '1 ½ taza de leche', '20 g de manteca', '200 g de dulce de leche'],
    steps: ['Licuá los huevos, la harina, la leche y la manteca derretida.', 'Cociná panqueques finos en la sartén apenas enmantecada.', 'Rellenalos con dulce de leche y enrollalos.'],
  },
  {
    key: 'arroz-con-leche', title: 'Arroz con leche', servings: 4, minutes: 40, meals: ['dulce'],
    constraints: ['sin_horno', 'una_olla'], tags: ['dulce'],
    ingredients: ['1 taza de arroz', '1 l de leche', '½ taza de azúcar', 'canela (opcional)', 'cáscara de limón (opcional)'],
    steps: ['Cociná el arroz en la leche con la cáscara de limón, a fuego bajo y revolviendo, 35 minutos.', 'Sumá el azúcar al final y espolvoreá canela.'],
  },
  {
    key: 'budin-de-banana', title: 'Budín de banana', servings: 8, minutes: 55, meals: ['dulce'],
    tags: ['dulce', 'horno'],
    ingredients: ['3 bananas', '2 huevos', '½ taza de azúcar', '½ taza de aceite', '2 tazas de harina', '1 cda de polvo de hornear'],
    steps: ['Pisá las bananas y mezclalas con los huevos, el azúcar y el aceite.', 'Sumá la harina y el polvo de hornear.', 'Horneá en un molde de budín 40 minutos a 180 °C.'],
  },
  {
    key: 'torta-de-manzana', title: 'Torta de manzana', servings: 8, minutes: 60, meals: ['dulce'],
    tags: ['dulce', 'horno'],
    ingredients: ['3 manzanas', '3 huevos', '1 taza de azúcar', '½ taza de aceite', '2 tazas de harina', '1 cda de polvo de hornear'],
    steps: ['Batí los huevos con el azúcar y el aceite; sumá la harina y el polvo de hornear.', 'Agregá las manzanas en cubos.', 'Horneá 45 minutos a 180 °C.'],
  },
];

const EPOCH = '2026-01-01T00:00:00.000Z';

function toRecipe(d: Def): Recipe {
  const id = `catalog:${d.key}`;
  const t = m.catalog; // null en español (el original)
  return {
    id,
    household_id: '',
    title: t?.titles[d.key] ?? d.title,
    source: 'catalog',
    source_url: null,
    servings: d.servings,
    total_minutes: d.minutes,
    meal_types: d.meals,
    constraints: d.constraints ?? [],
    tags: d.tags,
    steps: (t?.steps[d.key] ?? d.steps).join('\n'),
    image_url: null,
    created_at: EPOCH,
    updated_at: EPOCH,
    ingredients: d.ingredients.map((line, i) => {
      const p = parseIngredientLine(line);
      if (!p) throw new Error(`Ingrediente inválido en ${d.key}: ${line}`);
      // Se interpreta el original en español y se traduce solo el nombre (las cantidades no cambian)
      return { id: `${id}:${i}`, recipe_id: id, household_id: '', product_id: null, sort_order: i, ...p, name: t?.ingredients[p.name] ?? p.name };
    }),
  };
}

let built: { lang: string; list: Recipe[] } | null = null;

/** El recetario en el idioma de la app (se arma la primera vez que se usa). */
export function recipeCatalog(): Recipe[] {
  if (built?.lang !== lang) built = { lang, list: DEFS.map(toRecipe) };
  return built.list;
}
