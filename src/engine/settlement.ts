import { RULES } from '../rules/qatar';
import { addDays, calendarTenure, daysInclusive, parseISODate, toISODate, type Tenure } from './dates';
import { round2, type FormulaToken } from './money';

export type EndReason =
  | 'employeeResigned'
  | 'employerTerminated'
  | 'contractExpired'
  | 'mutual'
  | 'art61Dismissal'
  | 'art51EmployerBreach';

export type GratuityMethod = 'dailyBasic30' | 'weeklyWage';

export interface SettlementInput {
  startDate: string;
  endDate: string;
  contractType: 'indefinite' | 'fixed';
  endReason: EndReason;
  inProbation: boolean;
  probationLeavingTo: 'newEmployerInQatar' | 'leavingQatar';
  agreedProbationNoticeDays: number;
  basicSalary: number;
  grossSalary: number;
  gratuityDaysPerYear: number;
  gratuityMethod: GratuityMethod;
  unpaidLeaveDays: number;
  unusedLeaveDays: number;
  leaveDayBase: 30 | 26;
  unpaidWorkedDays: number;
  noticeDaysServed: number;
  contractNoticeDays: number;
  employerClaimsNotice: boolean;
  ticketOwed: number;
  deductions: number;
}

export type LineKey =
  | 'gratuity'
  | 'leavePay'
  | 'finalWages'
  | 'noticeOwedToYou'
  | 'noticeClaimedByEmployer'
  | 'ticket'
  | 'deductions';

export interface Line {
  key: LineKey;
  /** Signed amount, rounded to fils. Negative lines reduce the total. */
  amount: number;
  formula: FormulaToken[];
  legalBasis: string;
  estimate: boolean;
}

export type WarningKey =
  | 'notEligible'
  | 'art61'
  | 'art51'
  | 'probationNewEmployer'
  | 'probationLeavingQatar'
  | 'probationTooLong'
  | 'fixedTermEarly'
  | 'unpaidLeaveExcluded'
  | 'potentialNoticeClaim'
  | 'owesEmployer';

export type InputField = keyof SettlementInput;

export interface FieldError {
  field: InputField;
  key: 'required' | 'invalidDate' | 'dateRange' | 'endBeforeStart' | 'outOfRange' | 'grossBelowBasic';
}

export interface SettlementResult {
  ok: true;
  serviceDays: number;
  netServiceDays: number;
  serviceYears: number;
  tenure: Tenure;
  eligibleForGratuity: boolean;
  leaveEntitlementPerYear: number;
  statutoryNoticeDays: number;
  noticeShortfallDays: number;
  /** Notice pay the employer could claim when the worker resigned without full notice. */
  potentialNoticeClaim: number;
  /** Gratuity under the other calculation method, for comparison. */
  alternativeGratuity: number;
  lines: Line[];
  total: number;
  dueDate: string;
  warnings: WarningKey[];
  /** For Art. 61 dismissals: the total if the dismissal were treated as an ordinary termination. */
  totalIfDisputed: number | null;
}

export type SettlementOutcome = SettlementResult | { ok: false; errors: FieldError[] };

export const DEFAULT_INPUT: SettlementInput = {
  startDate: '',
  endDate: '',
  contractType: 'indefinite',
  endReason: 'employeeResigned',
  inProbation: false,
  probationLeavingTo: 'newEmployerInQatar',
  agreedProbationNoticeDays: 30,
  basicSalary: 0,
  grossSalary: 0,
  gratuityDaysPerYear: RULES.gratuity.minDaysPerYear.value,
  gratuityMethod: 'dailyBasic30',
  unpaidLeaveDays: 0,
  unusedLeaveDays: 0,
  leaveDayBase: 30,
  unpaidWorkedDays: 0,
  noticeDaysServed: 0,
  contractNoticeDays: 0,
  employerClaimsNotice: false,
  ticketOwed: 0,
  deductions: 0,
};

const NUMERIC_BOUNDS: Partial<Record<InputField, [number, number]>> = {
  basicSalary: [1, RULES.money.maxMonthlySalary],
  grossSalary: [0, RULES.money.maxMonthlySalary],
  gratuityDaysPerYear: [RULES.gratuity.minDaysPerYear.value, RULES.gratuity.maxContractDaysPerYear],
  unpaidLeaveDays: [0, 20_000],
  unusedLeaveDays: [0, 365],
  unpaidWorkedDays: [0, 31],
  noticeDaysServed: [0, RULES.notice.maxContractDays],
  contractNoticeDays: [0, RULES.notice.maxContractDays],
  agreedProbationNoticeDays: [0, RULES.probation.workerLeavingQatarMaxDays.value],
  ticketOwed: [0, RULES.money.maxTicket],
  deductions: [0, RULES.money.maxDeductions],
};

function validate(input: SettlementInput): FieldError[] {
  const errors: FieldError[] = [];
  const min = parseISODate(RULES.dates.min)!;
  const max = parseISODate(RULES.dates.max)!;

  for (const field of ['startDate', 'endDate'] as const) {
    if (!input[field]) {
      errors.push({ field, key: 'required' });
      continue;
    }
    const t = parseISODate(input[field]);
    if (t === null) errors.push({ field, key: 'invalidDate' });
    else if (t < min || t > max) errors.push({ field, key: 'dateRange' });
  }
  const start = parseISODate(input.startDate);
  const end = parseISODate(input.endDate);
  if (start !== null && end !== null && end < start) errors.push({ field: 'endDate', key: 'endBeforeStart' });

  for (const [field, [lo, hi]] of Object.entries(NUMERIC_BOUNDS) as [InputField, [number, number]][]) {
    const value = input[field] as number;
    if (!Number.isFinite(value)) {
      errors.push({ field, key: field === 'basicSalary' ? 'required' : 'outOfRange' });
    } else if (value < lo || value > hi) {
      errors.push({ field, key: field === 'basicSalary' && value === 0 ? 'required' : 'outOfRange' });
    }
  }
  if (Number.isFinite(input.grossSalary) && input.grossSalary > 0 && input.grossSalary < input.basicSalary) {
    errors.push({ field: 'grossSalary', key: 'grossBelowBasic' });
  }
  return errors;
}

function gratuityFor(
  basic: number,
  daysPerYear: number,
  netDays: number,
  method: GratuityMethod,
): { amount: number; formula: FormulaToken[] } {
  if (method === 'weeklyWage') {
    return {
      amount: ((basic * 12) / 52 / 7) * daysPerYear * (netDays / 365),
      formula: [basic, '×', 12, '÷', 52, '÷', 7, '×', daysPerYear, '×', netDays, '÷', 365],
    };
  }
  return {
    amount: (basic / 30) * daysPerYear * (netDays / 365),
    formula: [basic, '÷', 30, '×', daysPerYear, '×', netDays, '÷', 365],
  };
}

function statutoryNotice(input: SettlementInput, serviceYears: number): number {
  const p = RULES.probation;
  if (input.inProbation) {
    if (input.endReason === 'employerTerminated') return p.employerNoticeDays.value;
    if (input.probationLeavingTo === 'leavingQatar') {
      return Math.min(input.agreedProbationNoticeDays, p.workerLeavingQatarMaxDays.value);
    }
    return p.workerToNewEmployerDays.value;
  }
  const n = RULES.notice;
  const statutory = serviceYears <= n.thresholdServiceYears.value ? n.daysUpToThreshold.value : n.daysAboveThreshold.value;
  return Math.min(Math.max(statutory, input.contractNoticeDays), n.maxContractDays);
}

export function calculateSettlement(raw: SettlementInput): SettlementOutcome {
  const input: SettlementInput = { ...raw, grossSalary: raw.grossSalary > 0 ? raw.grossSalary : raw.basicSalary };
  const errors = validate(input);
  if (errors.length) return { ok: false, errors };

  const start = parseISODate(input.startDate)!;
  const end = parseISODate(input.endDate)!;
  const serviceDays = daysInclusive(start, end);
  const netServiceDays = Math.max(0, serviceDays - input.unpaidLeaveDays);
  const serviceYears = netServiceDays / 365;
  const eligible = netServiceDays >= RULES.gratuity.minServiceDays.value;
  const warnings: WarningKey[] = [];
  const lines: Line[] = [];
  const basic = input.basicSalary;
  const gross = input.grossSalary;

  // Gratuity (Art. 54, forfeited under Art. 61)
  const art61 = input.endReason === 'art61Dismissal';
  const main = gratuityFor(basic, input.gratuityDaysPerYear, netServiceDays, input.gratuityMethod);
  const other = gratuityFor(
    basic,
    input.gratuityDaysPerYear,
    netServiceDays,
    input.gratuityMethod === 'dailyBasic30' ? 'weeklyWage' : 'dailyBasic30',
  );
  if (!eligible) warnings.push('notEligible');
  if (art61) warnings.push('art61');
  if (input.endReason === 'art51EmployerBreach') warnings.push('art51');
  if (input.unpaidLeaveDays > 0) warnings.push('unpaidLeaveExcluded');
  lines.push({
    key: 'gratuity',
    amount: eligible && !art61 ? round2(main.amount) : 0,
    formula: eligible && !art61 ? main.formula : [0],
    legalBasis: art61 ? 'Art. 61' : 'Art. 54',
    estimate: input.unpaidLeaveDays > 0,
  });

  // Leave encashment (Art. 79/81, basic wage per Art. 72)
  const leaveEntitlementPerYear =
    serviceYears < RULES.leave.yearsThreshold ? RULES.leave.daysPerYearUnder5.value : RULES.leave.daysPerYear5Plus.value;
  if (input.unusedLeaveDays > 0) {
    lines.push({
      key: 'leavePay',
      amount: round2((basic / input.leaveDayBase) * input.unusedLeaveDays),
      formula: [basic, '÷', input.leaveDayBase, '×', input.unusedLeaveDays],
      legalBasis: 'Art. 81',
      estimate: input.leaveDayBase !== 30,
    });
  }

  // Unpaid wages for days worked
  if (input.unpaidWorkedDays > 0) {
    lines.push({
      key: 'finalWages',
      amount: round2((gross / 30) * input.unpaidWorkedDays),
      formula: [gross, '÷', 30, '×', input.unpaidWorkedDays],
      legalBasis: 'Art. 66–67',
      estimate: false,
    });
  }

  // Notice (Art. 49 / Art. 39), on basic wage
  const noticeApplies = input.endReason === 'employeeResigned' || input.endReason === 'employerTerminated';
  const statutoryNoticeDays = noticeApplies ? statutoryNotice(input, serviceYears) : 0;
  const noticeShortfallDays = noticeApplies ? Math.max(0, statutoryNoticeDays - input.noticeDaysServed) : 0;
  const noticeAmount = round2((basic / 30) * noticeShortfallDays);
  const noticeFormula: FormulaToken[] = [basic, '÷', 30, '×', noticeShortfallDays];
  const noticeBasis = input.inProbation ? 'Art. 39' : 'Art. 49';
  let potentialNoticeClaim = 0;
  if (noticeApplies && noticeShortfallDays > 0) {
    if (input.endReason === 'employerTerminated') {
      lines.push({ key: 'noticeOwedToYou', amount: noticeAmount, formula: noticeFormula, legalBasis: noticeBasis, estimate: false });
    } else {
      potentialNoticeClaim = noticeAmount;
      if (input.employerClaimsNotice) {
        lines.push({
          key: 'noticeClaimedByEmployer',
          amount: -noticeAmount,
          formula: noticeFormula,
          legalBasis: noticeBasis,
          estimate: false,
        });
      } else {
        warnings.push('potentialNoticeClaim');
      }
    }
  }
  if (input.inProbation) {
    if (serviceDays > RULES.probation.maxDays.value) warnings.push('probationTooLong');
    if (input.endReason === 'employeeResigned') {
      warnings.push(input.probationLeavingTo === 'leavingQatar' ? 'probationLeavingQatar' : 'probationNewEmployer');
    }
  } else if (input.contractType === 'fixed' && noticeApplies) {
    warnings.push('fixedTermEarly');
  }

  if (input.ticketOwed > 0) {
    lines.push({ key: 'ticket', amount: round2(input.ticketOwed), formula: [input.ticketOwed], legalBasis: 'Art. 57', estimate: false });
  }
  if (input.deductions > 0) {
    lines.push({
      key: 'deductions',
      amount: -round2(input.deductions),
      formula: [input.deductions],
      legalBasis: 'Art. 54',
      estimate: false,
    });
  }

  const total = round2(lines.reduce((sum, line) => sum + line.amount, 0));
  if (total < 0) warnings.push('owesEmployer');

  const leftWithoutNotice = input.endReason === 'employeeResigned' && noticeShortfallDays > 0;
  const deadline = RULES.settlementDeadline;
  const dueDate = toISODate(addDays(end, leftWithoutNotice ? deadline.leftWithoutNoticeDays.value : deadline.normalDays.value));

  let totalIfDisputed: number | null = null;
  if (art61) {
    const disputed = calculateSettlement({ ...raw, endReason: 'employerTerminated' });
    if (disputed.ok) totalIfDisputed = disputed.total;
  }

  return {
    ok: true,
    serviceDays,
    netServiceDays,
    serviceYears,
    tenure: calendarTenure(start, end),
    eligibleForGratuity: eligible,
    leaveEntitlementPerYear,
    statutoryNoticeDays,
    noticeShortfallDays,
    potentialNoticeClaim,
    alternativeGratuity: eligible && !art61 ? round2(other.amount) : 0,
    lines,
    total,
    dueDate,
    warnings,
    totalIfDisputed,
  };
}
