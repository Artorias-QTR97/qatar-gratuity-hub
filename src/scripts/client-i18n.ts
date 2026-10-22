import type { Dict, DictKey } from '../i18n/en';
import type { FormulaToken } from '../engine/money';

interface ClientData {
  lang: string;
  intl: string;
  homeCurrency: string;
  dict: Dict;
}

const data: ClientData = JSON.parse(document.getElementById('i18n-data')?.textContent ?? '{}');
const locale = `${data.intl}-u-nu-latn`;

export const lang = data.lang;
export const homeCurrency = data.homeCurrency;

export function t(key: DictKey, vars?: Record<string, string | number>): string {
  let text = data.dict[key] ?? key;
  if (vars) for (const [name, value] of Object.entries(vars)) text = text.replaceAll(`{${name}}`, String(value));
  return text;
}

function safeFormat(make: () => Intl.NumberFormat, fallback: () => Intl.NumberFormat): Intl.NumberFormat {
  try {
    return make();
  } catch {
    return fallback();
  }
}

const qar = safeFormat(
  () => new Intl.NumberFormat(locale, { style: 'currency', currency: 'QAR', currencyDisplay: 'code' }),
  () => new Intl.NumberFormat('en-QA', { style: 'currency', currency: 'QAR', currencyDisplay: 'code' }),
);
const plain = safeFormat(
  () => new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }),
  () => new Intl.NumberFormat('en', { maximumFractionDigits: 2 }),
);

export const money = (amount: number) => qar.format(amount);
export const num = (value: number, maxDigits = 2) =>
  maxDigits === 2 ? plain.format(value) : new Intl.NumberFormat(locale, { maximumFractionDigits: maxDigits }).format(value);

export function currency(amount: number, code: string): string {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: code, currencyDisplay: 'code' }).format(amount);
  } catch {
    return `${code} ${plain.format(amount)}`;
  }
}

export function date(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const value = new Date(Date.UTC(y, m - 1, d));
  try {
    return new Intl.DateTimeFormat(`${locale}-ca-gregory`, { dateStyle: 'long', timeZone: 'UTC' }).format(value);
  } catch {
    return iso;
  }
}

export function formula(tokens: FormulaToken[]): string {
  return tokens.map((tok) => (typeof tok === 'number' ? plain.format(tok) : tok)).join(' ');
}

/** Creates an element with text content only (never HTML). */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
