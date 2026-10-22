// Approximate units per 1 QAR, used only when the live rate fetch fails.
// USD comes from the 3.64 peg; the others are rough reference values and are labelled as possibly outdated in the UI.
export const FX_FALLBACK = {
  asOf: '2025-06-30',
  rates: {
    USD: 1 / 3.64,
    EUR: 0.235,
    GBP: 0.202,
    INR: 23.6,
    PKR: 77.9,
    NPR: 37.7,
    BDT: 33.6,
    PHP: 15.6,
    LKR: 82.3,
    EGP: 13.6,
    KES: 35.5,
  } as Record<string, number>,
};
