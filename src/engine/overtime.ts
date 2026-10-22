import { RULES } from '../rules/qatar';
import { round2, type FormulaToken } from './money';

export interface OvertimeInput {
  basicSalary: number;
  schedule: 'normal' | 'ramadan';
  hourlyMethod: 'daily30' | 'weekly';
  dayOTHours: number;
  nightOTHours: number;
  restDayHours: number;
  publicHolidayHours: number;
  workingDays: number;
  isShiftWorker: boolean;
  isManager: boolean;
}

export type OvertimeLineKey = 'dayOT' | 'nightOT' | 'restDay' | 'publicHoliday';

export interface OvertimeLine {
  key: OvertimeLineKey;
  hours: number;
  multiplier: number;
  amount: number;
  formula: FormulaToken[];
  legalBasis: string;
  estimate: boolean;
}

export type OvertimeWarning = 'shiftNoNightPremium' | 'overDailyCap';

export type OvertimeOutcome =
  | { ok: true; notApplicable: true }
  | { ok: true; notApplicable: false; hourlyRate: number; lines: OvertimeLine[]; total: number; warnings: OvertimeWarning[] }
  | { ok: false; errors: { field: keyof OvertimeInput; key: 'required' | 'outOfRange' }[] };

export const DEFAULT_OVERTIME: OvertimeInput = {
  basicSalary: 0,
  schedule: 'normal',
  hourlyMethod: 'daily30',
  dayOTHours: 0,
  nightOTHours: 0,
  restDayHours: 0,
  publicHolidayHours: 0,
  workingDays: 0,
  isShiftWorker: false,
  isManager: false,
};

const HOUR_FIELDS = ['dayOTHours', 'nightOTHours', 'restDayHours', 'publicHolidayHours'] as const;

export function calculateOvertime(input: OvertimeInput): OvertimeOutcome {
  if (input.isManager) return { ok: true, notApplicable: true };

  const errors: { field: keyof OvertimeInput; key: 'required' | 'outOfRange' }[] = [];
  if (!Number.isFinite(input.basicSalary) || input.basicSalary <= 0) errors.push({ field: 'basicSalary', key: 'required' });
  else if (input.basicSalary > RULES.money.maxMonthlySalary) errors.push({ field: 'basicSalary', key: 'outOfRange' });
  for (const field of HOUR_FIELDS) {
    const v = input[field];
    if (!Number.isFinite(v) || v < 0 || v > 744) errors.push({ field, key: 'outOfRange' });
  }
  if (!Number.isFinite(input.workingDays) || input.workingDays < 0 || input.workingDays > 31) {
    errors.push({ field: 'workingDays', key: 'outOfRange' });
  }
  if (errors.length) return { ok: false, errors };

  const h = RULES.hours;
  const ramadan = input.schedule === 'ramadan';
  const dailyHours = ramadan ? h.ramadanDaily.value : h.normalDaily.value;
  const weeklyHours = ramadan ? h.ramadanWeekly.value : h.normalWeekly.value;
  const basic = input.basicSalary;
  const hourlyRate = input.hourlyMethod === 'weekly' ? (basic * 12) / 52 / weeklyHours : basic / (30 * dailyHours);
  const hourlyFormula: FormulaToken[] =
    input.hourlyMethod === 'weekly' ? [basic, '×', 12, '÷', 52, '÷', weeklyHours] : [basic, '÷', 30, '÷', dailyHours];

  const o = RULES.overtime;
  const dayMultiplier = 1 + o.dayPremium.value;
  const nightMultiplier = input.isShiftWorker ? dayMultiplier : 1 + o.nightPremium.value;
  const specs: [OvertimeLineKey, number, number, string, boolean][] = [
    ['dayOT', input.dayOTHours, dayMultiplier, o.dayPremium.legalBasis, false],
    ['nightOT', input.nightOTHours, nightMultiplier, o.nightPremium.legalBasis, false],
    ['restDay', input.restDayHours, o.restDayMultiplier.value, o.restDayMultiplier.legalBasis, !o.restDayMultiplier.verified],
    [
      'publicHoliday',
      input.publicHolidayHours,
      o.publicHolidayMultiplier.value,
      o.publicHolidayMultiplier.legalBasis,
      !o.publicHolidayMultiplier.verified,
    ],
  ];

  const lines: OvertimeLine[] = specs
    .filter(([, hours]) => hours > 0)
    .map(([key, hours, multiplier, legalBasis, estimate]) => ({
      key,
      hours,
      multiplier,
      amount: round2(hourlyRate * multiplier * hours),
      formula: [...hourlyFormula, '×', multiplier, '×', hours],
      legalBasis,
      estimate,
    }));

  const warnings: OvertimeWarning[] = [];
  if (input.isShiftWorker && input.nightOTHours > 0) warnings.push('shiftNoNightPremium');
  const maxOTPerDay = h.maxDailyIncludingOT.value - dailyHours;
  if (input.workingDays > 0 && (input.dayOTHours + input.nightOTHours) / input.workingDays > maxOTPerDay) {
    warnings.push('overDailyCap');
  }

  return {
    ok: true,
    notApplicable: false,
    hourlyRate: round2(hourlyRate),
    lines,
    total: round2(lines.reduce((s, l) => s + l.amount, 0)),
    warnings,
  };
}
