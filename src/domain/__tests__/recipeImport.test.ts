import { describe, expect, it } from 'vitest';
import { decodeEntities, parseDuration, parseRecipePage, parseRecipeText, parseYield } from '../recipeImport';

const URL_BLOG = 'https://www.cocinablog.com.uy/receta/tortilla-de-papas/';

/** WordPress + Yoast + WP Recipe Maker: un @graph con Article, WebPage, Person y la Recipe. */
const yoastPage = `<!DOCTYPE html><html lang="es"><head>
<meta charset="UTF-8">
<title>Tortilla de papas jugosa | Cocina Blog</title>
<meta property="og:title" content="Tortilla de papas jugosa - Cocina Blog" />
<meta property="og:image" content="https://www.cocinablog.com.uy/wp-content/uploads/tortilla.jpg" />
<script type="application/ld+json" class="yoast-schema-graph">{"@context":"https://schema.org","@graph":[
 {"@type":"Article","@id":"${URL_BLOG}#article","headline":"Tortilla de papas jugosa","author":{"@id":"#/schema/person/1"}},
 {"@type":"WebPage","@id":"${URL_BLOG}","name":"Tortilla de papas jugosa | Cocina Blog"},
 {"@type":"Person","@id":"#/schema/person/1","name":"Ana"},
 {"@type":"Recipe","name":"Tortilla de papas &amp; cebolla","author":{"@type":"Person","name":"Ana"},
  "image":["https://www.cocinablog.com.uy/wp-content/uploads/tortilla-500x500.jpg","https://www.cocinablog.com.uy/wp-content/uploads/tortilla-500x375.jpg"],
  "recipeYield":["4","4 porciones"],"prepTime":"PT15M","cookTime":"PT30M","totalTime":"PT45M",
  "recipeIngredient":["1 kg de papas","6 huevos","1 cebolla","Aceite para fre&iacute;r","Sal a gusto"],
  "recipeInstructions":[
   {"@type":"HowToStep","text":"Pelar y cortar las papas en l&aacute;minas finas.","name":"Pelar y cortar las papas en láminas finas.","url":"${URL_BLOG}#wprm-step-1"},
   {"@type":"HowToStep","text":"Fre&iacute;r las papas con la cebolla a fuego bajo <strong>20 minutos</strong>."},
   {"@type":"HowToStep","text":"Batir los huevos, mezclar y cuajar de los dos lados."}
  ],"recipeCategory":["Cena"],"recipeCuisine":["Española"]}
]}</script>
</head><body><h1>Tortilla de papas jugosa</h1></body></html>`;

/** Un sitio grande: la Recipe sola, @type en array, HowToSection y yield en inglés. */
const sectionsPage = `<html><head>
<title>Lasagna Recipe</title>
<script type="application/ld+json">[{"@context":"http://schema.org","@type":"BreadcrumbList","itemListElement":[]},
{"@context":"http://schema.org","@type":["Recipe","NewsArticle"],"name":"Classic Lasagna",
"image":{"@type":"ImageObject","url":"/images/lasagna.jpg","width":1200},
"recipeYield":"Serves 8","prepTime":"PT30M","cookTime":"PT1H15M",
"recipeIngredient":["1 lb ground beef","2 cups ricotta cheese","12 lasagna noodles","3 cups marinara sauce"],
"recipeInstructions":[
 {"@type":"HowToSection","name":"For the sauce","itemListElement":[
   {"@type":"HowToStep","text":"Brown the beef in a large pot."},
   {"@type":"HowToStep","text":"Add the marinara and simmer 10 minutes."}]},
 {"@type":"HowToSection","name":"To assemble","itemListElement":[
   {"@type":"HowToStep","text":"Layer noodles, sauce and ricotta."},
   {"@type":"HowToStep","text":"Bake at 375°F for 45 minutes."}]}
]}]</script></head><body></body></html>`;

/** Microdatos (sitios viejos, sin JSON-LD). */
const microdataPage = `<html><head><title>Arroz con leche - Recetas de la abuela</title>
<meta property="og:title" content="Arroz con leche"></head><body>
<div itemscope itemtype="http://schema.org/Recipe">
  <h1 itemprop="name">Arroz con leche cremoso</h1>
  <img itemprop="image" src="/fotos/arroz.jpg" content="https://abuela.com/fotos/arroz.jpg">
  <span>Rinde: <span itemprop="recipeYield">6 porciones</span></span>
  <meta itemprop="totalTime" content="PT50M">
  <h2>Ingredientes</h2>
  <ul>
    <li itemprop="recipeIngredient">1 l de leche</li>
    <li itemprop="recipeIngredient">200 g de arroz</li>
    <li itemprop="ingredients">150 g de az&uacute;car</li>
    <li itemprop="recipeIngredient">1 rama de canela</li>
  </ul>
  <div itemprop="recipeInstructions">
    <ol>
      <li>Hervir la leche con la canela.</li>
      <li>Agregar el arroz y cocinar 40 minutos revolviendo.</li>
      <li>Sumar el azúcar al final.</li>
    </ol>
  </div>
</div></body></html>`;

const nonRecipePage = `<html><head><title>Noticias</title>
<meta property="og:title" content="El dólar cerró en baja">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"NewsArticle","headline":"El dólar cerró en baja"}</script>
</head><body><p>Texto de la noticia.</p></body></html>`;

describe('parseRecipePage', () => {
  it('lee la Recipe dentro del @graph de Yoast', () => {
    const r = parseRecipePage(yoastPage, URL_BLOG)!;
    expect(r.title).toBe('Tortilla de papas & cebolla');
    expect(r.servings).toBe(4);
    expect(r.totalMinutes).toBe(45);
    expect(r.ingredients).toEqual(['1 kg de papas', '6 huevos', '1 cebolla', 'Aceite para freír', 'Sal a gusto']);
    expect(r.steps).toEqual([
      'Pelar y cortar las papas en láminas finas.',
      'Freír las papas con la cebolla a fuego bajo 20 minutos.',
      'Batir los huevos, mezclar y cuajar de los dos lados.',
    ]);
    expect(r.image).toBe('https://www.cocinablog.com.uy/wp-content/uploads/tortilla-500x500.jpg');
    expect(r.sourceUrl).toBe(URL_BLOG);
  });

  it('aplana las HowToSection y suma preparación + cocción', () => {
    const r = parseRecipePage(sectionsPage, 'https://food.example.com/recipes/lasagna')!;
    expect(r.title).toBe('Classic Lasagna');
    expect(r.servings).toBe(8);
    expect(r.totalMinutes).toBe(105);
    expect(r.ingredients).toHaveLength(4);
    expect(r.steps).toEqual([
      'For the sauce:',
      'Brown the beef in a large pot.',
      'Add the marinara and simmer 10 minutes.',
      'To assemble:',
      'Layer noodles, sauce and ricotta.',
      'Bake at 375°F for 45 minutes.',
    ]);
    expect(r.image).toBe('https://food.example.com/images/lasagna.jpg');
  });

  it('usa microdatos si no hay JSON-LD', () => {
    const r = parseRecipePage(microdataPage, 'https://abuela.com/arroz-con-leche')!;
    expect(r.title).toBe('Arroz con leche cremoso');
    expect(r.servings).toBe(6);
    expect(r.totalMinutes).toBe(50);
    expect(r.ingredients).toEqual(['1 l de leche', '200 g de arroz', '150 g de azúcar', '1 rama de canela']);
    expect(r.steps).toEqual([
      'Hervir la leche con la canela.',
      'Agregar el arroz y cocinar 40 minutos revolviendo.',
      'Sumar el azúcar al final.',
    ]);
    expect(r.image).toBe('https://abuela.com/fotos/arroz.jpg');
  });

  it('recipeInstructions como texto con saltos y título desde og:title', () => {
    const html = `<meta property="og:title" content="Pancakes | Blog">
<script type="application/ld+json">{"@type":"Recipe","recipeYield":2,
"recipeIngredient":["1 cup flour","1 egg"],"recipeInstructions":"Mix everything.\\nCook on a hot pan."}</script>`;
    const r = parseRecipePage(html, 'https://x.com/p')!;
    expect(r.title).toBe('Pancakes');
    expect(r.servings).toBe(2);
    expect(r.totalMinutes).toBeNull();
    expect(r.steps).toEqual(['Mix everything.', 'Cook on a hot pan.']);
  });

  it('tolera JSON con saltos de línea crudos dentro de los strings', () => {
    const html = `<script type="application/ld+json">{"@type":"Recipe","name":"Flan",
"recipeIngredient":["4 huevos","1 l de leche"],"recipeInstructions":["Batir.
Hornear a baño María."]}</script>`;
    const r = parseRecipePage(html, 'https://x.com/flan')!;
    expect(r.title).toBe('Flan');
    expect(r.ingredients).toEqual(['4 huevos', '1 l de leche']);
  });

  it('devuelve null si la página no es una receta', () => {
    expect(parseRecipePage(nonRecipePage, 'https://diario.com/nota')).toBeNull();
    expect(parseRecipePage('', 'https://x.com')).toBeNull();
    expect(parseRecipePage('<script type="application/ld+json">{roto</script>', 'https://x.com')).toBeNull();
  });
});

describe('ayudantes', () => {
  it('rinde', () => {
    expect(parseYield('4 porciones')).toBe(4);
    expect(parseYield('Serves 4-6')).toBe(4);
    expect(parseYield(['', '6 servings'])).toBe(6);
    expect(parseYield(3)).toBe(3);
    expect(parseYield('unas cuantas')).toBeNull();
  });
  it('duraciones ISO 8601', () => {
    expect(parseDuration('PT1H30M')).toBe(90);
    expect(parseDuration('PT90M')).toBe(90);
    expect(parseDuration('P0DT0H45M')).toBe(45);
    expect(parseDuration('PT0S')).toBeNull();
    expect(parseDuration('45 min')).toBeNull();
  });
  it('entidades', () => {
    expect(decodeEntities('Pur&eacute; &amp; m&aacute;s &#189; &#x00BD;')).toBe('Puré & más ½ ½');
    expect(decodeEntities('&amp;frac12; taza')).toBe('½ taza');
  });
});

describe('parseRecipeText', () => {
  it('título, ingredientes hasta «Preparación» y pasos numerados', () => {
    const r = parseRecipeText(`Fideos con tuco

Porciones: 4
Tiempo: 40 min

Ingredientes
- 400 g de fideos
- 1 lata de tomate triturado
- 1 cebolla
- sal a gusto

Preparación:
1. Picar la cebolla y rehogarla.
2. Agregar el tomate y cocinar 20 minutos.
3. Hervir los fideos y servir con la salsa.`)!;
    expect(r.title).toBe('Fideos con tuco');
    expect(r.servings).toBe(4);
    expect(r.totalMinutes).toBe(40);
    expect(r.ingredients).toEqual(['400 g de fideos', '1 lata de tomate triturado', '1 cebolla', 'sal a gusto']);
    expect(r.steps).toEqual([
      'Picar la cebolla y rehogarla.',
      'Agregar el tomate y cocinar 20 minutos.',
      'Hervir los fideos y servir con la salsa.',
    ]);
    expect(r.sourceUrl).toBeNull();
  });

  it('en inglés, sin título y con «Instructions»', () => {
    const r = parseRecipeText('2 cups flour\n1 egg\n1 cup milk\nInstructions\nMix.\nCook.')!;
    expect(r.title).toBe('');
    expect(r.ingredients).toEqual(['2 cups flour', '1 egg', '1 cup milk']);
    expect(r.steps).toEqual(['Mix.', 'Cook.']);
  });

  it('sin encabezado de pasos: el primer renglón largo empieza los pasos', () => {
    const r = parseRecipeText(
      'Ensalada\n2 tomates\n1 lechuga\naceite y sal\nLavar todo, cortar los tomates en gajos y condimentar a gusto antes de servir.',
    )!;
    expect(r.ingredients).toEqual(['2 tomates', '1 lechuga', 'aceite y sal']);
    expect(r.steps).toHaveLength(1);
  });

  it('«Paso 1:» es un paso, no un encabezado; chino/japonés', () => {
    const r = parseRecipeText('Ingredientes (para 2)\n200 g de arroz\nPasos\nPaso 1: Lavar el arroz.\nPaso 2: Hervir.')!;
    expect(r.servings).toBe(2);
    expect(r.steps).toEqual(['Lavar el arroz.', 'Hervir.']);
    const ja = parseRecipeText('トマトパスタ\n材料\n400 g パスタ\n1 缶 カットトマト\n作り方\n1. 玉ねぎを炒める')!;
    expect(ja.title).toBe('トマトパスタ');
    expect(ja.ingredients).toEqual(['400 g パスタ', '1 缶 カットトマト']);
    expect(ja.steps).toEqual(['玉ねぎを炒める']);
  });

  it('null si no hay ingredientes', () => {
    expect(parseRecipeText('')).toBeNull();
    expect(parseRecipeText('Hola, ¿cómo andás?')).toBeNull();
  });
});
