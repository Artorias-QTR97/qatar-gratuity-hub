/** Rounds half-up to 2 decimals (fils). */
export function round2(value: number): number {
  return Math.round((value + Math.sign(value) * Number.EPSILON) * 100) / 100;
}

/** A formula as tokens: numbers are formatted by the UI, strings are operators. */
export type FormulaToken = number | '×' | '÷' | '+' | '−';
