/**
 * Contrato común de los lectores de precios de las webs de los súper (uno por cadena). Durante el desarrollo cada
 * lector vive en su archivo; la función que se publica (index.ts) es un solo archivo sin dependencias, como
 * precios-uy, para poder pegarla en el editor de Edge Functions de Supabase.
 */

/** Un producto con su precio en la web de una cadena */
export interface WebItem {
  /** Cadena, con la misma clave que usa la app: 'tata', 'el-dorado', 'disco', 'devoto', 'geant' */
  chain: string;
  /** Id del producto en esa web (SKU), para no repetir */
  id: string;
  /** Nombre tal cual lo publica la web */
  name: string;
  brand: string | null;
  /** Código de barras (EAN-13/EAN-8) si la web lo publica y es real (no códigos internos de balanza) */
  ean: string | null;
  /** Lo que sale en la web por unidad de venta (el paquete; o el kilo si perKg), sin descuentos de tarjetas */
  price: number;
  /** Precio antes de la oferta de la propia cadena, si la hay (null si no hay oferta) */
  listPrice: number | null;
  /** Se vende por peso: `price` es por kilo */
  perKg: boolean;
  /** Página del producto (para «ver en la web») */
  url: string;
  image: string | null;
}

export interface SearchOptions {
  /** Zona (cada cadena la interpreta: Ta-Ta usa el departamento) */
  region?: string | null;
  /** Máximo de resultados (cada web tiene su tope) */
  limit?: number;
  /** Para las pruebas: un fetch de mentira */
  fetchImpl?: typeof fetch;
}

/** Un lector: busca en la web de una cadena. Nunca tira error por un producto raro: lo saltea. */
export type WebSearch = (query: string, opts?: SearchOptions) => Promise<WebItem[]>;

/** Encabezados de navegador (las webs devuelven otra cosa a clientes desconocidos) */
export const BROWSER_HEADERS: Record<string, string> = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
  'Accept-Language': 'es-UY,es;q=0.9',
};
