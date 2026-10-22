// Every legal constant used by the engine lives here. A change in the law should be
// a one-file edit plus a test update. See LEGAL-VERIFY.md for the source of each rule.

export interface Rule<T> {
  value: T;
  legalBasis: string;
  verified: boolean;
  note?: string;
}

const rule = <T>(value: T, legalBasis: string, verified: boolean, note?: string): Rule<T> => ({
  value,
  legalBasis,
  verified,
  note,
});

export const RULES = {
  lastLegalReview: '2026-10-22',

  gratuity: {
    minServiceDays: rule(365, 'Art. 54', true),
    minDaysPerYear: rule(21, 'Art. 54 (three weeks)', true),
    maxContractDaysPerYear: 90,
    wageBase: rule('basic' as const, 'Art. 54 + Art. 72', true),
    lostOnArt61Dismissal: rule(true, 'Art. 61 + Law 9/2026', true),
    unpaidLeaveExcluded: rule(
      true,
      'Ministry/HR practice',
      false,
      'Art. 54 does not say whether unpaid leave days count as service.',
    ),
  },

  notice: {
    thresholdServiceYears: rule(2, 'Art. 49 (Law 18/2020)', true),
    daysUpToThreshold: rule(30, 'Art. 49', true),
    daysAboveThreshold: rule(60, 'Art. 49', true),
    maxContractDays: 90,
    wageBase: rule('basic' as const, 'Art. 49 (Law 18/2020)', true),
  },

  probation: {
    maxDays: rule(184, 'Art. 39 (6 months)', true),
    employerNoticeDays: rule(30, 'Art. 39', true),
    workerToNewEmployerDays: rule(30, 'Art. 39(1)', true),
    workerLeavingQatarMaxDays: rule(60, 'Art. 39(2)', true),
    newEmployerCompensationMaxMonths: rule(2, 'Art. 39(1)', true),
  },

  leave: {
    daysPerYearUnder5: rule(21, 'Art. 79', true),
    daysPerYear5Plus: rule(28, 'Art. 79', true),
    yearsThreshold: 5,
    encashmentWageBase: rule('basic' as const, 'Art. 81 + Art. 72', true),
  },

  hours: {
    normalDaily: rule(8, 'Art. 73', true),
    normalWeekly: rule(48, 'Art. 73', true),
    ramadanDaily: rule(6, 'Art. 73', true),
    ramadanWeekly: rule(36, 'Art. 73', true),
    maxDailyIncludingOT: rule(10, 'Art. 74', true),
  },

  overtime: {
    dayPremium: rule(0.25, 'Art. 74', true),
    nightPremium: rule(0.5, 'Art. 74 (21:00–06:00)', true),
    restDayMultiplier: rule(
      1.5,
      'Art. 75',
      false,
      'Read as 150% of basic; the text can also be read as basic + 150% (250%).',
    ),
    publicHolidayMultiplier: rule(1.5, 'Art. 78 → Art. 75', false),
  },

  settlementDeadline: {
    normalDays: rule(1, 'Art. 67', true),
    leftWithoutNoticeDays: rule(7, 'Art. 67', true),
  },

  money: {
    qarPerUsdPeg: 3.64,
    maxMonthlySalary: 1_000_000,
    maxTicket: 50_000,
    maxDeductions: 1_000_000,
  },

  dates: { min: '1990-01-01', max: '2050-12-31' },
} as const;
