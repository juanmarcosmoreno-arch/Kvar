/** Moneda para mostrar los gastos: la que elige cada uno en Ajustes o, si no, la del país del teléfono. */
import { locale } from '../i18n';

const KEY = 'stoka:moneda';

export const CURRENCIES = ['UYU', 'ARS', 'BRL', 'CLP', 'COP', 'MXN', 'PEN', 'PYG', 'USD', 'EUR', 'GBP', 'SEK', 'DKK', 'NOK', 'CNY', 'JPY'] as const;

const BY_REGION: Record<string, string> = {
  UY: 'UYU', AR: 'ARS', BR: 'BRL', CL: 'CLP', CO: 'COP', MX: 'MXN', PE: 'PEN', PY: 'PYG', US: 'USD', GB: 'GBP',
  SE: 'SEK', DK: 'DKK', NO: 'NOK', CN: 'CNY', JP: 'JPY', ES: 'EUR', FR: 'EUR', IT: 'EUR', PT: 'EUR', DE: 'EUR',
};

export function currency(): string {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved) return saved;
  } catch {
    /* sin almacenamiento */
  }
  const region = locale.split('-').pop()?.toUpperCase() ?? '';
  return BY_REGION[region] ?? 'UYU';
}

export function setCurrency(code: string) {
  try {
    localStorage.setItem(KEY, code);
  } catch {
    /* sin almacenamiento */
  }
}

/** «$ 1.250», «1 250 kr», «¥3,400». Sin centavos a partir de 100. */
export function formatCurrency(n: number, opts: { cents?: boolean } = {}): string {
  const cents = opts.cents ?? Math.abs(n) < 100;
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency(),
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: cents ? 2 : 0,
      maximumFractionDigits: cents ? 2 : 0,
    }).format(n);
  } catch {
    return `$ ${Math.round(n)}`;
  }
}

/** Nombre de la moneda en el idioma de la app («peso uruguayo») */
export function currencyName(code: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: 'currency' }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** Para ejes de gráficos: «$ 12 mil», «$12K» */
export function formatCurrencyCompact(n: number): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency(),
      currencyDisplay: 'narrowSymbol',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(n);
  } catch {
    return formatCurrency(n);
  }
}
