import { describe, expect, it } from 'vitest';
import { en } from '../../i18n/en';
import { DICTIONARIES, LANGUAGES } from '../../i18n';

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('translations (I1)', () => {
  it('every language in LANGUAGES has a dictionary', () => {
    for (const lang of LANGUAGES) expect(DICTIONARIES[lang.code], lang.code).toBeDefined();
  });

  for (const [code, dict] of Object.entries(DICTIONARIES)) {
    it(`${code} has exactly the English keys and placeholders`, () => {
      expect(Object.keys(dict).sort()).toEqual(Object.keys(en).sort());
      for (const key of Object.keys(en) as (keyof typeof en)[]) {
        expect(placeholders(dict[key]), `${code}:${key}`).toEqual(placeholders(en[key]));
        expect(dict[key].trim().length, `${code}:${key}`).toBeGreaterThan(0);
      }
    });
  }
});
