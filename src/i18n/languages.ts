/** Idiomas de Stoka. El español es el original; el resto son traducciones completas (las verifica TypeScript). */
export const LANGUAGES = [
  { code: 'es', name: 'Español', locale: 'es-UY' },
  { code: 'en', name: 'English', locale: 'en-US' },
  { code: 'pt', name: 'Português', locale: 'pt-BR' },
  { code: 'fr', name: 'Français', locale: 'fr-FR' },
  { code: 'it', name: 'Italiano', locale: 'it-IT' },
  { code: 'sv', name: 'Svenska', locale: 'sv-SE' },
  { code: 'da', name: 'Dansk', locale: 'da-DK' },
  { code: 'zh', name: '简体中文', locale: 'zh-CN' },
  { code: 'ja', name: '日本語', locale: 'ja-JP' },
] as const;

export type Lang = (typeof LANGUAGES)[number]['code'];
export type LangChoice = Lang | 'auto';

export const isLang = (x: unknown): x is Lang => LANGUAGES.some((l) => l.code === x);

/** Primer idioma del teléfono que Stoka tiene («pt-PT» → pt, «zh-Hant-TW» → zh, «nb» → da). Si ninguno, inglés. */
export function detectLang(preferred: readonly string[]): Lang {
  for (const tag of preferred) {
    const base = tag.toLowerCase().split(/[-_]/)[0];
    if (isLang(base)) return base;
    if (base === 'nb' || base === 'no' || base === 'nn') return 'da'; // noruego: lo más cercano
  }
  return preferred.length ? 'en' : 'es';
}

/** Región del teléfono si coincide con el idioma (es-AR, en-GB, pt-PT…); si no, la de por defecto. */
export function localeFor(lang: Lang, preferred: readonly string[]): string {
  const own = preferred.find((t) => t.toLowerCase().split(/[-_]/)[0] === lang);
  if (own && /^[a-z]{2}[-_][A-Za-z]{2,4}/.test(own) && lang !== 'zh') {
    // «en-US@posix», «es_UY.UTF-8»…: solo lo que Intl acepta
    try {
      const [tag] = Intl.getCanonicalLocales(own.replace('_', '-').split(/[@.]/)[0]);
      if (tag) return tag;
    } catch {
      /* etiqueta rara: la del idioma */
    }
  }
  return LANGUAGES.find((l) => l.code === lang)!.locale;
}
