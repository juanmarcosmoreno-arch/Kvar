// precios-web: precios de las webs de los súper (Ta-Ta, El Dorado, Disco, Devoto y Géant).
// ARCHIVO GENERADO: no editar a mano. Se arma con «npm run build:precios-web» a partir de handler.ts y los lectores
// (tata.ts, eldorado.ts, gdu.ts). Para publicarlo: copiá este archivo entero en el editor de la función en Supabase.
// @ts-nocheck

// supabase/functions/precios-web/types.ts
var BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
  "Accept-Language": "es-UY,es;q=0.9"
};

// supabase/functions/precios-web/eldorado.ts
var BASE = "https://www.eldorado.com.uy";
var API = `${BASE}/api/catalog_system/pub/products/search`;
var CHAIN = "el-dorado";
var VTEX_PAGE_MAX = 50;
var DEFAULT_LIMIT = 20;
var DEAD_SELLERS = /^eldoradouy$/i;
var VTEX_NO_BRAND = /^(otras marcas|sin marca|gen[eé]ric[oa]s?|varios|-)$/i;
var VTEX_CONNECTORS = /* @__PURE__ */ new Set(["a", "al", "con", "de", "del", "el", "en", "la", "las", "lo", "los", "para", "por", "y"]);
var PAYMENT_PROMO = /santander|ita[uú]|brou|bbva|scotia|hsbc|heritage|bandes|banco|bank|tarjeta|visa|master|amex|american express|diners|cabal|\boca\b|\banda\b|creditel|prex|mi ?dinero|passcard|d[eé]bito|cr[eé]dito/i;
var vtexNum = (v) => typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : 0;
var str = (v) => typeof v === "string" ? v.replace(/\s+/g, " ").trim() : typeof v === "number" ? String(v) : "";
var cents = (n) => Math.round(n * 100) / 100;
var isObj = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
function gtinCheckDigitOk(code) {
  let sum = 0;
  for (let i = code.length - 2, w = 3; i >= 0; i--, w = 4 - w) sum += Number(code[i]) * w;
  return (10 - sum % 10) % 10 === Number(code[code.length - 1]);
}
function realGtin(code) {
  const raw = str(code);
  if (!/^\d+$/.test(raw)) return null;
  const s = raw.replace(/^0+/, "");
  let gtin;
  if (s.length === 8) gtin = s;
  else if (s.length >= 10 && s.length <= 13) gtin = s.padStart(13, "0");
  else return null;
  if (!gtinCheckDigitOk(gtin)) return null;
  if (gtin.length === 8) return /^[02]/.test(gtin) ? null : gtin;
  const prefix = Number(gtin.slice(0, 3));
  if (prefix >= 200 && prefix <= 299) return null;
  if (prefix >= 20 && prefix <= 29 || prefix >= 40 && prefix <= 59) return null;
  if (prefix >= 140 && prefix <= 199) return null;
  if (prefix >= 980) return null;
  return gtin;
}
function highlights(o) {
  if (!Array.isArray(o.DiscountHighLight)) return [];
  return o.DiscountHighLight.map((d) => isObj(d) ? str(d["<Name>k__BackingField"] ?? d.Name ?? d.name) : "").filter(Boolean);
}
function availableOffer(sellers) {
  if (!Array.isArray(sellers)) return null;
  for (const s of sellers) {
    if (!isObj(s) || DEAD_SELLERS.test(str(s.sellerId))) continue;
    const o = s.commertialOffer;
    if (!isObj(o)) continue;
    if (!(vtexNum(o.Price) > 0) || o.IsAvailable === false) continue;
    if (o.AvailableQuantity !== void 0 && !(vtexNum(o.AvailableQuantity) > 0)) continue;
    return o;
  }
  return null;
}
function smallImage(images) {
  if (!Array.isArray(images) || !isObj(images[0])) return null;
  const url = str(images[0].imageUrl);
  if (!/^https?:\/\//.test(url)) return null;
  return url.replace(/^http:/, "https:").replace(/\/arquivos\/ids\/(\d+)\//, "/arquivos/ids/$1-300-300/");
}
var cleanName = (s) => s.replace(/\s+\.+$/, "").trim();
function parseVtexCatalog(json2, chain, baseUrl) {
  if (!Array.isArray(json2)) return [];
  const base = baseUrl.replace(/\/+$/, "");
  const out = [];
  const seen = /* @__PURE__ */ new Set();
  for (const p of json2) {
    if (!isObj(p) || !Array.isArray(p.items)) continue;
    const items = p.items;
    const brandName = str(p.brand);
    const brand = brandName && !VTEX_NO_BRAND.test(brandName) ? brandName : null;
    const slug = str(p.linkText);
    const link = str(p.link);
    const url = slug ? `${base}/${slug}/p` : /^https?:\/\//.test(link) ? link : base;
    for (const item of items) {
      if (!isObj(item)) continue;
      const id = str(item.itemId);
      if (!id || seen.has(id)) continue;
      const offer = availableOffer(item.sellers);
      if (!offer) continue;
      let price = vtexNum(offer.Price);
      if (highlights(offer).some((h) => PAYMENT_PROMO.test(h))) price = Math.max(price, vtexNum(offer.PriceWithoutDiscount));
      const list = vtexNum(offer.ListPrice);
      const unit = str(item.measurementUnit).toLowerCase();
      const perKg = /^(kg|kgs|kilo|kilos|kilogramos?)$/.test(unit);
      const mult = vtexNum(item.unitMultiplier);
      const factor = perKg || !(mult > 0) ? 1 : mult;
      const name = cleanName(items.length > 1 ? str(item.nameComplete) || str(item.name) || str(p.productName) : str(p.productName) || str(item.nameComplete) || str(item.name));
      if (!name) continue;
      seen.add(id);
      out.push({
        chain,
        id,
        name,
        brand,
        ean: realGtin(item.ean),
        price: cents(price * factor),
        listPrice: list > price ? cents(list * factor) : null,
        perKg,
        url,
        image: smallImage(item.images)
      });
    }
  }
  return out;
}
function searchText(query) {
  return query.normalize("NFC").replace(/['’´`]/g, "").replace(/(\d),(\d)/g, "$1.$2").replace(/[^\p{L}\p{N}.]+/gu, " ").replace(/(?<!\d)\.|\.(?!\d)/g, " ").replace(/\s+/g, " ").trim().slice(0, 100).trim();
}
function ftText(query) {
  const q = searchText(query);
  const words = q.split(" ").filter((w) => w && !VTEX_CONNECTORS.has(w.toLowerCase()));
  return words.length ? words.join(" ") : q;
}
function vtexTokens(s) {
  const words = s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/(\d),(\d)/g, "$1.$2").split(/[^a-z0-9.]+/).map((w) => w.replace(/^\.+|\.+$/g, "")).filter(Boolean);
  const out = [...words];
  for (let i = 0; i + 1 < words.length; i++) if (/^\d+(\.\d+)?$/.test(words[i]) && /^[a-z]+$/.test(words[i + 1])) out.push(words[i] + words[i + 1]);
  return out;
}
function vtexWordIn(w, tokens) {
  return tokens.some((t) => t.startsWith(w) && !(/\d$/.test(w) && /[\d.]/.test(t.charAt(w.length))));
}
function rankByQuery(items, query) {
  const words = vtexTokens(searchText(query)).filter((w) => w.length > 1 && !VTEX_CONNECTORS.has(w)).map((w) => /^[a-z]{4,}es$/.test(w) ? w.slice(0, -2) : /^[a-z]{3,}s$/.test(w) ? w.slice(0, -1) : w);
  if (!words.length) return items;
  const score = (x) => {
    const tokens = vtexTokens(`${x.name} ${x.brand ?? ""}`);
    return words.reduce((n, w) => n + (vtexWordIn(w, tokens) ? 1 : 0), 0);
  };
  return items.map((x, i) => ({ x, i, s: score(x) })).sort((a, b) => b.s - a.s || a.i - b.i).map((r) => r.x);
}
async function getElDoradoJson(url, fetchImpl) {
  for (let attempt = 0; ; attempt++) {
    const init = {
      headers: { ...BROWSER_HEADERS, Accept: "application/json" },
      signal: typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function" ? AbortSignal.timeout(1e4) : void 0
    };
    const started = Date.now();
    const res = fetchImpl ? await fetchImpl(url, init) : await fetch(url, init);
    if (res.status >= 500 && attempt === 0 && Date.now() - started < 5e3) {
      await res.text().catch(() => "");
      await new Promise((r) => setTimeout(r, 300));
      continue;
    }
    if (!res.ok) throw new Error(`El Dorado respondi\xF3 ${res.status}`);
    const body = await res.text();
    try {
      return JSON.parse(body);
    } catch {
      throw new Error("El Dorado no respondi\xF3 JSON");
    }
  }
}
var searchElDorado = async (query, opts = {}) => {
  const all = searchText(query);
  if (!all) return [];
  const asked = Math.floor(vtexNum(opts.limit));
  const limit = asked > 0 ? Math.min(asked, VTEX_PAGE_MAX) : DEFAULT_LIMIT;
  const size = Math.min(VTEX_PAGE_MAX, Math.max(limit + 10, limit * 2));
  const get = async (q) => parseVtexCatalog(await getElDoradoJson(`${API}?ft=${encodeURIComponent(q)}&_from=0&_to=${size - 1}&O=OrderByScoreDESC`, opts.fetchImpl), CHAIN, BASE);
  const strict = ftText(all);
  let items = await get(strict);
  if (!items.length && strict !== all) items = await get(all);
  return rankByQuery(items, all).slice(0, limit);
};

// supabase/functions/precios-web/gdu.ts
var GDU_HOSTS = {
  disco: "www.disco.com.uy",
  devoto: "www.devoto.com.uy",
  geant: "www.geant.com.uy"
};
var GDU_PAGE_SIZE = 12;
var GDU_NO_BRAND = /^(?:-+|\.+|sin marca|otras? marcas?|varios|gen[eé]ric[oa]s?|frutas?|verduras?|frutas y verduras|bovina|porcina|ovina)$/i;
var GDU_BANK = /\bdcto\b|lbl-dcto|santander|ita[uú]|hiper\s*m[aá]s|bbva|scotia|brou|\boca\b|\bvisa\b|master\s*card|amex|tarjeta|banco/i;
var GDU_ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
var gduDecode = (s) => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (all, e) => {
  if (e[0] !== "#") return GDU_ENTITIES[e.toLowerCase()] ?? all;
  const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : Number(e.slice(1));
  return Number.isFinite(code) && code > 0 && code <= 1114111 ? String.fromCodePoint(code) : all;
});
var gduText = (html) => gduDecode(html.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
var gduMoney = (n) => Math.round(n * 100) / 100;
function gduNumber(raw) {
  const t = gduDecode(raw).replace(/[\s$]/g, "");
  let n = NaN;
  if (/^\d{1,3}(?:\.\d{3})+(?:,\d+)?$/.test(t)) n = Number(t.replace(/\./g, "").replace(",", "."));
  else if (/^\d+(?:[.,]\d+)?$/.test(t)) n = Number(t.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}
var gduDiv = (cls) => new RegExp(`<div\\s[^>]*class="(?:[^"]*\\s)?${cls}(?:\\s[^"]*)?"[^>]*>`, "i");
function gduPriceBlock(html) {
  const val = (from) => {
    const m = /<span\s[^>]*class="val"[^>]*>([^<]*)<\/span>(\s*<span[^>]*>\s*\/\s*([^<]*)<\/span>)?/i.exec(html.slice(from));
    return m ? { n: gduNumber(m[1]), unit: m[3] ? gduText(m[3]).toLowerCase() : null } : null;
  };
  const before = gduDiv("before").exec(html);
  const text = gduDiv("text").exec(html);
  const now = text ? val(text.index) : null;
  return {
    now: now?.n ?? null,
    unit: now?.unit ?? null,
    before: before ? val(before.index)?.n ?? null : null,
    bank: GDU_BANK.test(html)
  };
}
function parseGduPrices(html) {
  const starts = [...html.matchAll(/<div\s[^>]*class="(?:[^"]*\s)?product-prices(?:\s[^"]*)?"/gi)].map((m) => m.index ?? 0);
  const blocks = starts.map((s, i) => gduPriceBlock(html.slice(s, starts[i + 1] ?? html.length)));
  const usable = blocks.filter((b) => !b.bank && b.now !== null);
  const kg = usable.find((b) => b.unit !== null && /^(?:kg|kilo|kilos|kilogramos?)\.?$/.test(b.unit));
  const main = kg ?? usable.find((b) => b.unit === null);
  if (!main || main.now === null) return null;
  const price = gduMoney(main.now);
  return {
    price,
    listPrice: main.before !== null && main.before > price + 9e-3 ? gduMoney(main.before) : null,
    perKg: !!kg
  };
}
var gduBrand = (raw) => {
  const b = gduText(raw ?? "");
  return b && !GDU_NO_BRAND.test(b) ? b : null;
};
var gduOrigin = (host) => {
  const h = host.trim().replace(/\/+$/, "");
  return /^https?:\/\//i.test(h) ? h : `https://${h}`;
};
function gduAbsolute(href, origin) {
  const h = gduDecode(href).trim();
  if (/^https?:\/\//i.test(h)) return h;
  if (h.startsWith("//")) return `https:${h}`;
  return `${origin}${h.startsWith("/") ? "" : "/"}${h}`;
}
function gduImage(card, origin) {
  const fig = /<figure\b[\s\S]*?<\/figure>/i.exec(card)?.[0] ?? card;
  for (const m of fig.matchAll(/<img\b[^>]*>/gi)) {
    const src = /\ssrc="([^"]*)"/i.exec(m[0])?.[1] ?? "";
    if (src && !/^data:/i.test(src)) return gduAbsolute(src, origin);
  }
  return null;
}
function parseGduSearch(html, chain, host) {
  const origin = gduOrigin(host);
  let list = html;
  const start = html.search(/<div\s[^>]*id="lista-productos"/i);
  if (start >= 0) {
    const end = html.indexOf("<footer", start);
    list = html.slice(start, end > start ? end : html.length);
  } else if (/class="(?:[^"]*\s)?no-products-message\b|class="(?:[^"]*\s)?total-prods\b[^"]*"[^>]*>\s*<strong>\s*0\s*<\/strong>/i.test(html)) {
    return [];
  }
  const starts = [...list.matchAll(/<div\s[^>]*class="(?:[^"]*\s)?product-item(?:\s[^"]*)?"[^>]*>/gi)].map((m) => m.index ?? 0);
  const out = [];
  const seen = /* @__PURE__ */ new Set();
  for (let i = 0; i < starts.length; i++) {
    try {
      const card = list.slice(starts[i], starts[i + 1] ?? list.length);
      const link = /<h3[^>]*>\s*<a\s[^>]*href="([^"]*\/product\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/i.exec(card);
      if (!link) continue;
      const path = gduDecode(link[1]).split(/[?#]/)[0];
      const id = /\/product\/(?:[^/]*\/)?([^/]+)\/?$/.exec(path)?.[1] ?? "";
      const name = gduText(link[2]);
      if (!id || !name || seen.has(id)) continue;
      const pricesAt = card.search(/<div\s[^>]*class="(?:[^"]*\s)?desc-prices/i);
      if (pricesAt < 0) continue;
      const rest2 = card.slice(pricesAt);
      const stop = rest2.search(/<div\s[^>]*class="(?:[^"]*\s)?(?:prod-labels|prod-add)\b/i);
      const p = parseGduPrices(stop > 0 ? rest2.slice(0, stop) : rest2);
      if (!p) continue;
      const brand = /<a\s[^>]*href="[^"]*\/products\/brand\/[^"]*"[^>]*>([\s\S]*?)<\/a>/i.exec(card)?.[1];
      seen.add(id);
      out.push({
        chain,
        id,
        name,
        brand: gduBrand(brand),
        ean: null,
        price: p.price,
        listPrice: p.listPrice,
        perKg: p.perKg,
        url: gduAbsolute(path, origin),
        image: gduImage(card, origin)
      });
    } catch {
    }
  }
  return out;
}
var gduTimeout = () => typeof AbortSignal !== "undefined" && "timeout" in AbortSignal ? AbortSignal.timeout(1e4) : void 0;
var GDU_NAMES = { disco: "Disco", devoto: "Devoto", geant: "G\xE9ant" };
function gduGet(url, fetchImpl) {
  return fetchImpl(url, {
    headers: { ...BROWSER_HEADERS, Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" },
    redirect: "follow",
    signal: gduTimeout()
  });
}
function gduHost(chain) {
  const host = GDU_HOSTS[chain];
  if (!host) throw new Error(`cadena de GDU desconocida: ${chain}`);
  return host;
}
function gduQuery(query) {
  const q = String(query ?? "").replace(/[/\\?#%+]+/g, " ").replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "").replace(/\s+/g, " ").trim();
  const cut = Array.from(q).slice(0, 100).join("").trim();
  return /^[.\s]*$/.test(cut) ? "" : cut;
}
function searchGdu(chain) {
  const host = gduHost(chain);
  return async (query, opts = {}) => {
    const q = gduQuery(query);
    if (!q) return [];
    const want = Number(opts.limit ?? GDU_PAGE_SIZE);
    const limit = Number.isFinite(want) ? Math.min(GDU_PAGE_SIZE, Math.max(1, Math.floor(want))) : GDU_PAGE_SIZE;
    const res = await gduGet(`https://${host}/productos/keyword/${encodeURIComponent(q)}`, opts.fetchImpl ?? fetch);
    if (!res.ok) throw new Error(`${GDU_NAMES[chain]} respondi\xF3 ${res.status}`);
    return parseGduSearch(await res.text(), chain, host).slice(0, limit);
  };
}

// supabase/functions/precios-web/tata.ts
var SITE = "https://www.tata.com.uy";
var MAX = 50;
var MONTEVIDEO = "tatauymontevideo";
var MERCEDES = "tatauycolonia;tatauymercedes";
var TREINTA_Y_TRES = "tatauyminas;tatauytreintaytres";
var SELLERS = {
  montevideo: MONTEVIDEO,
  "ciudad de la costa": MONTEVIDEO,
  "costa de oro": MONTEVIDEO,
  "la paz y las piedras": MONTEVIDEO,
  "la paz": MONTEVIDEO,
  "las piedras": MONTEVIDEO,
  "san jose": MONTEVIDEO,
  "san jose de mayo": MONTEVIDEO,
  canelones: "tatauycanelones",
  maldonado: "tatauymaldonado",
  "punta del este": "tatauymaldonado",
  paysandu: "tatauypaysandu",
  salto: "tatauysalto",
  tacuarembo: "tatauytacuarembo",
  colonia: "tatauycolonia",
  "colonia del sacramento": "tatauycolonia",
  soriano: MERCEDES,
  mercedes: MERCEDES,
  "rio negro": MERCEDES,
  "fray bentos": MERCEDES,
  "cerro largo": "tatauymelo",
  melo: "tatauymelo",
  lavalleja: "tatauyminas",
  minas: "tatauyminas",
  durazno: "tatauydurazno",
  florida: "tatauyflorida",
  rivera: "tatauyrivera",
  artigas: "tatauyartigas",
  flores: "tatauytrinidad",
  trinidad: "tatauytrinidad",
  "treinta y tres": TREINTA_Y_TRES,
  rocha: "tatauyrocha"
};
var POSTAL = {
  "11800": MONTEVIDEO,
  "90000": "tatauycanelones",
  "20000": "tatauymaldonado",
  "60000": "tatauypaysandu",
  "50000": "tatauysalto",
  "45000": "tatauytacuarembo",
  "70000": "tatauycolonia",
  "75000": MERCEDES,
  "37000": "tatauymelo",
  "30000": "tatauyminas",
  "97000": "tatauydurazno",
  "94000": "tatauyflorida",
  "40000": "tatauyrivera",
  "55000": "tatauyartigas",
  "85000": "tatauytrinidad",
  "33000": TREINTA_Y_TRES,
  "27000": "tatauyrocha"
};
var plain = (s) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
function departmentSellers(department) {
  const s = plain(department ?? "");
  if (/^\d{5}$/.test(s)) return POSTAL[s] ?? MONTEVIDEO;
  const [, main = s, city = ""] = /^([^(]*?)\s*(?:\(([^)]*)\))?$/.exec(s) ?? [];
  return SELLERS[s] ?? SELLERS[main.trim()] ?? SELLERS[city.trim()] ?? MONTEVIDEO;
}
var regionIdOf = (sellers) => btoa(`SW#${sellers}`);
var timeout = () => typeof AbortSignal !== "undefined" && "timeout" in AbortSignal ? AbortSignal.timeout(1e4) : void 0;
function searchUrl(term, sellers, first) {
  const variables = {
    first,
    after: "0",
    sort: "score_desc",
    term,
    selectedFacets: [
      { key: "channel", value: JSON.stringify({ salesChannel: "4", regionId: regionIdOf(sellers) }) },
      { key: "locale", value: "es-uy" }
    ]
  };
  return `${SITE}/api/graphql?${new URLSearchParams({ operationName: "ProductsQuery", variables: JSON.stringify(variables) })}`;
}
async function getJson(url, fetchImpl) {
  const res = await fetchImpl(url, {
    headers: { ...BROWSER_HEADERS, Accept: "application/json", "Content-Type": "application/json" },
    signal: timeout()
  });
  if (!res.ok) throw new Error(`Ta-Ta respondi\xF3 ${res.status}`);
  const json2 = await res.json();
  if (!json2?.data?.search && Array.isArray(json2?.errors) && json2.errors.length) {
    throw new Error(`Ta-Ta respondi\xF3 con error: ${String(json2.errors[0]?.message ?? "").slice(0, 100)}`);
  }
  return json2;
}
var PROBE = "leche";
var looksLikeGrocery = (json2) => parseTataProducts(json2).filter((x) => /^leche\b/.test(plain(x.name))).length >= 3;
var zones = /* @__PURE__ */ new Map();
function zoneOk(sellers, fetchImpl) {
  let p = zones.get(sellers);
  if (!p) {
    const q = getJson(searchUrl(PROBE, sellers, 10), fetchImpl).then(looksLikeGrocery);
    const forget = () => {
      if (zones.get(sellers) === q) zones.delete(sellers);
    };
    q.then((ok) => ok || forget(), forget);
    zones.set(sellers, q);
    p = q;
  }
  return p;
}
async function zoneFor(sellers, fetchImpl) {
  if (await zoneOk(sellers, fetchImpl)) return sellers;
  if (sellers !== MONTEVIDEO && await zoneOk(MONTEVIDEO, fetchImpl)) return MONTEVIDEO;
  throw new Error("Ta-Ta cambi\xF3 (la b\xFAsqueda no trae almac\xE9n ni en Montevideo)");
}
function realEan(raw) {
  const code = typeof raw === "string" || typeof raw === "number" ? String(raw).trim() : "";
  if (!/^\d+$/.test(code)) return null;
  const s = code.replace(/^0+/, "");
  let gtin;
  if (s.length === 8) gtin = s;
  else if (s.length >= 10 && s.length <= 13) gtin = s.padStart(13, "0");
  else return null;
  let sum = 0;
  for (let i = gtin.length - 2, w = 3; i >= 0; i--, w = 4 - w) sum += Number(gtin[i]) * w;
  if ((10 - sum % 10) % 10 !== Number(gtin[gtin.length - 1])) return null;
  if (gtin.length === 8) return /^[02]/.test(gtin) ? null : gtin;
  const prefix = Number(gtin.slice(0, 3));
  if (prefix >= 200 && prefix <= 299) return null;
  if (prefix >= 20 && prefix <= 29 || prefix >= 40 && prefix <= 59) return null;
  if (prefix >= 140 && prefix <= 199) return null;
  if (prefix >= 980) return null;
  return gtin;
}
var NO_BRAND = /^(otras marcas|otra marca|sin marca|gen[eé]ric[oa]s?|varios)$/i;
var money = (n) => Math.round(n * 100) / 100;
var num = (x) => typeof x === "number" && Number.isFinite(x) ? x : 0;
function offerOf(node) {
  let best = null;
  for (const o of node.offers?.offers ?? []) {
    if (!o || num(o.price) <= 0 || typeof o.availability !== "string" || !/\/InStock$/.test(o.availability)) continue;
    if (!best || num(o.price) < num(best.price)) best = o;
  }
  return best;
}
function parseTataProducts(json2) {
  const edges = json2?.data?.search?.products?.edges;
  if (!Array.isArray(edges)) return [];
  const out = [];
  const seen = /* @__PURE__ */ new Set();
  for (const edge of edges) {
    try {
      const node = edge?.node;
      if (!node) continue;
      const id = String(node.sku ?? node.id ?? "");
      const name = String(node.name ?? node.isVariantOf?.name ?? "").replace(/\s+/g, " ").trim();
      const slug = typeof node.slug === "string" ? node.slug.trim() : "";
      const o = offerOf(node);
      if (!id || !name || !slug || !o || seen.has(id)) continue;
      const unit = (node.measurementUnit ?? "").trim().toLowerCase();
      const mult = num(node.unitMultiplier) > 0 ? num(node.unitMultiplier) : 1;
      const perKg = /^(kg|kgs|kilo|kilos|kilogramos?)$/.test(unit);
      let price = num(o.price);
      const list = num(o.listPrice);
      if (perKg && mult < 1) {
        price = list > 0 && Math.abs(money(list * mult) - price) <= 0.01 ? list : money(price / mult);
      }
      const brand = String(node.brand?.name ?? node.brand?.brandName ?? "").trim();
      const linkText = (slug.endsWith(`-${id}`) ? slug.slice(0, -(id.length + 1)) : slug) || slug;
      seen.add(id);
      out.push({
        chain: "tata",
        id,
        name,
        brand: brand && !NO_BRAND.test(brand) ? brand : null,
        ean: realEan(node.ean),
        price: money(price),
        listPrice: list > price + 9e-3 ? money(list) : null,
        perKg,
        // Hay slugs con eñe («dulce-de-leche-doña-elvira-900-g»): la web los abre codificados
        url: `${SITE}/${encodeURIComponent(linkText)}/p`,
        // La foto no es imprescindible: si viene con otra forma, el producto sale igual, sin foto
        image: (Array.isArray(node.image) ? node.image : []).find((i) => typeof i?.url === "string")?.url ?? null
      });
    } catch {
    }
  }
  return out;
}
async function searchTata(query, opts = {}) {
  const q = query.replace(/\s+/g, " ").trim();
  if (!q) return [];
  const fetchImpl = opts.fetchImpl ?? fetch;
  const want = Number(opts.limit ?? 20);
  const limit = Number.isFinite(want) ? Math.min(MAX, Math.max(1, Math.floor(want))) : 20;
  const sellers = await zoneFor(departmentSellers(opts.region), fetchImpl);
  return parseTataProducts(await getJson(searchUrl(q, sellers, limit), fetchImpl)).slice(0, limit);
}

// supabase/functions/precios-web/handler.ts
var READERS = {
  tata: searchTata,
  "el-dorado": searchElDorado,
  disco: searchGdu("disco"),
  devoto: searchGdu("devoto"),
  geant: searchGdu("geant")
};
var WEB_CHAINS = Object.keys(READERS);
var FRESH_HOURS = 12;
var MAX_QUERIES = 40;
var MAX_QUERY_LENGTH = 80;
var PER_CHAIN = 2;
var RESULTS = 20;
var queryKey = (q) => q.normalize("NFC").toLowerCase().replace(/\s+/g, " ").trim().slice(0, MAX_QUERY_LENGTH);
var regionKey = (chain, region) => chain === "tata" ? region || "Montevideo" : "";
var env = (name) => typeof Deno !== "undefined" ? Deno.env.get(name) : void 0;
function disabledChains(value = env("PRECIOS_WEB_APAGADAS")) {
  return new Set((value ?? "").split(",").map((c) => c.trim().toLowerCase()).filter(Boolean));
}
function rest(path, init = {}) {
  const url = env("SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  return fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...init.headers ?? {} }
  });
}
var inList = (values) => `(${values.map((v) => `"${v.replace(/["\\]/g, (c) => `\\${c}`)}"`).join(",")})`;
async function readCache(chain, region, queries) {
  const out = /* @__PURE__ */ new Map();
  const since = new Date(Date.now() - FRESH_HOURS * 36e5).toISOString();
  try {
    const params = new URLSearchParams({
      select: "query,items",
      chain: `eq.${chain}`,
      region: `eq.${region}`,
      query: `in.${inList(queries)}`,
      fetched_at: `gte.${since}`
    });
    const res = await rest(`web_prices?${params}`);
    if (!res?.ok) return out;
    for (const row of await res.json()) out.set(row.query, row.items);
  } catch {
  }
  return out;
}
async function writeCache(rows) {
  if (!rows.length) return;
  try {
    await rest("web_prices?on_conflict=chain,region,query", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(rows)
    });
  } catch {
  }
}
async function eachLimited(items, limit, fn) {
  let next = 0;
  const worker = async () => {
    while (next < items.length) await fn(items[next++]);
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}
async function lookup(chains, queries, region, readers = READERS) {
  const results = {};
  const failed = [];
  await Promise.all(chains.map(async (chain) => {
    const read = readers[chain];
    if (!read) return;
    const zone = regionKey(chain, region);
    const cached = await readCache(chain, zone, queries);
    const own = {};
    const fresh = [];
    let errors = 0;
    const missing = queries.filter((q) => {
      const hit = cached.get(q);
      if (hit) own[q] = hit;
      return !hit;
    });
    await eachLimited(missing, PER_CHAIN, async (q) => {
      try {
        const items = (await read(q, { region: zone || null, limit: RESULTS })).slice(0, RESULTS);
        own[q] = items;
        fresh.push({ chain, region: zone, query: q, items, fetched_at: (/* @__PURE__ */ new Date()).toISOString() });
      } catch {
        errors++;
        own[q] = [];
      }
    });
    if (missing.length && errors === missing.length) failed.push(chain);
    results[chain] = own;
    await writeCache(fresh);
  }));
  return { results, failed };
}
var CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};
var json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
async function handle(req, readers = READERS) {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  let input;
  try {
    input = await req.json();
  } catch {
    return json({ error: "json" }, 400);
  }
  const off = disabledChains();
  const chains = Array.isArray(input.chains) ? [...new Set(input.chains.filter((c) => typeof c === "string" && c in readers && !off.has(c)))] : [];
  if (!chains.length) return json({ error: "chains" }, 400);
  const raw = input.action === "search" ? [input.query] : input.action === "lookup" && Array.isArray(input.queries) ? input.queries : null;
  if (!raw) return json({ error: "action" }, 400);
  const queries = [...new Set(raw.filter((q) => typeof q === "string").map(queryKey).filter((q) => q.length >= 2))].slice(0, MAX_QUERIES);
  if (!queries.length) return json({ error: "query" }, 400);
  const region = typeof input.region === "string" && input.region.trim() ? input.region.trim().slice(0, 40) : null;
  const { results, failed } = await lookup(chains, queries, region, readers);
  return json({ results, failed, at: (/* @__PURE__ */ new Date()).toISOString() });
}
if (typeof Deno !== "undefined") Deno.serve((req) => handle(req));
export {
  WEB_CHAINS,
  disabledChains,
  handle,
  lookup,
  queryKey
};
