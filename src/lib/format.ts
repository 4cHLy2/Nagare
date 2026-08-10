import type { Settings } from '../types';

// Intl.NumberFormat ctor is slow and this runs per label per render
const cache = new Map<string, Intl.NumberFormat>();
function nf(key: string, locale: string, opts: Intl.NumberFormatOptions): Intl.NumberFormat {
  let f = cache.get(key);
  if (!f) {
    try {
      f = new Intl.NumberFormat(locale || 'en-US', opts);
    } catch {
      f = new Intl.NumberFormat('en-US', opts);
    }
    cache.set(key, f);
  }
  return f;
}

// currency, or plain + suffix
// notation: 'compact', compactDisplay: 'short', // nope, every label became 1,2 k
export function formatValue(v: number, s: Settings): string {
  if (s.numberFormat === 'currency') {
    const key = `c:${s.locale}:${s.currency}:${s.decimals}`;
    try {
      return nf(key, s.locale, {
        style: 'currency',
        currency: s.currency || 'EUR',
        minimumFractionDigits: s.decimals,
        maximumFractionDigits: s.decimals,
      }).format(v);
    } catch {
      /* junk currency code, fall through to plain */
    }
  }
  const key = `p:${s.locale}:${s.decimals}`;
  const n = nf(key, s.locale, {
    minimumFractionDigits: s.decimals,
    maximumFractionDigits: s.decimals,
  }).format(v);
  return s.valueSuffix ? `${n} ${s.valueSuffix}` : n;
}

// "24 %" etc. locale puts the space there, not me
export function formatPercent(v: number, total: number, s: Settings): string {
  if (!total || total <= 0) return '—'; // em dash, looks better than 0%
  return nf(`pct:${s.locale}`, s.locale, {
    style: 'percent',
    maximumFractionDigits: 1,
  }).format(v / total);
}

// picker list. not exhaustive, add on request
export const CURRENCIES: { code: string; label: string }[] = [
  { code: 'EUR', label: '€ Euro' },
  { code: 'USD', label: '$ US Dollar' },
  { code: 'GBP', label: '£ Pound' },
  { code: 'CHF', label: 'Fr. Swiss Franc' },
  { code: 'JPY', label: '¥ Yen' },
  { code: 'SEK', label: 'kr Swedish Krona' },
  { code: 'CAD', label: '$ Canadian Dollar' },
  { code: 'AUD', label: '$ Australian Dollar' },
];
