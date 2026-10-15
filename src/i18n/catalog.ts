/**
 * Traducción del recetario de Stoka (src/domain/recipeCatalog.ts). El español es el original, así que
 * en español no hay traducción (null). Las claves son las de las recetas y los nombres de ingrediente en español.
 */
export interface CatalogTranslation {
  /** clave de receta → título */
  titles: Record<string, string>;
  /** nombre del ingrediente en español («tomate triturado») → nombre en este idioma */
  ingredients: Record<string, string>;
  /** clave de receta → pasos */
  steps: Record<string, string[]>;
}
