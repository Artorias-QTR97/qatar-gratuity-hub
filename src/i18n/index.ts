import { en, type Dict, type DictKey } from './en';
import { ar } from './ar';
import { bn } from './bn';
import { hi } from './hi';
import { ml } from './ml';
import { ne } from './ne';
import { si } from './si';
import { ta } from './ta';
import { tl } from './tl';
import { ur } from './ur';

export interface Language {
  code: string;
  /** Name of the language in that language. */
  name: string;
  /** English name, shown on the language chooser. */
  englishName: string;
  dir: 'ltr' | 'rtl';
  /** BCP 47 locale for Intl formatting (always with Latin digits). */
  intl: string;
  /** Currency shown first in the converter. */
  homeCurrency: string;
  /** True once a native speaker has reviewed the translation. */
  reviewed: boolean;
}

// Ordered by the size of each community in Qatar, after English and Arabic.
export const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', englishName: 'English', dir: 'ltr', intl: 'en-QA', homeCurrency: 'USD', reviewed: true },
  { code: 'ar', name: 'العربية', englishName: 'Arabic', dir: 'rtl', intl: 'ar-QA', homeCurrency: 'EGP', reviewed: false },
  { code: 'hi', name: 'हिन्दी', englishName: 'Hindi', dir: 'ltr', intl: 'hi-IN', homeCurrency: 'INR', reviewed: false },
  { code: 'ml', name: 'മലയാളം', englishName: 'Malayalam', dir: 'ltr', intl: 'ml-IN', homeCurrency: 'INR', reviewed: false },
  { code: 'ne', name: 'नेपाली', englishName: 'Nepali', dir: 'ltr', intl: 'ne-NP', homeCurrency: 'NPR', reviewed: false },
  { code: 'bn', name: 'বাংলা', englishName: 'Bengali', dir: 'ltr', intl: 'bn-BD', homeCurrency: 'BDT', reviewed: false },
  { code: 'tl', name: 'Filipino', englishName: 'Filipino', dir: 'ltr', intl: 'fil-PH', homeCurrency: 'PHP', reviewed: false },
  { code: 'ur', name: 'اردو', englishName: 'Urdu', dir: 'rtl', intl: 'ur-PK', homeCurrency: 'PKR', reviewed: false },
  { code: 'ta', name: 'தமிழ்', englishName: 'Tamil', dir: 'ltr', intl: 'ta-IN', homeCurrency: 'INR', reviewed: false },
  { code: 'si', name: 'සිංහල', englishName: 'Sinhala', dir: 'ltr', intl: 'si-LK', homeCurrency: 'LKR', reviewed: false },
];

export const DICTIONARIES: Record<string, Dict> = { en, ar, hi, ml, ne, bn, tl, ur, ta, si };

export function getLanguage(code: string): Language {
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];
}

/** Returns a translator for a language. Missing keys fall back to English. */
export function translator(code: string) {
  const dict = DICTIONARIES[code] ?? en;
  return (key: DictKey, vars?: Record<string, string | number>): string => {
    let text = dict[key] ?? en[key];
    if (vars) {
      for (const [name, value] of Object.entries(vars)) text = text.replaceAll(`{${name}}`, String(value));
    }
    return text;
  };
}

export type { Dict, DictKey };
