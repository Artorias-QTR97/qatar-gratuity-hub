import { describe, expect, it } from 'vitest';
import { calculateSettlement, DEFAULT_INPUT, type SettlementInput, type SettlementResult } from '../settlement';
import { calendarTenure, daysInclusive, parseISODate } from '../dates';

const A1: SettlementInput = {
  ...DEFAULT_INPUT,
  startDate: '2021-06-01',
  endDate: '2026-10-22',
  endReason: 'employerTerminated',
  basicSalary: 8000,
  grossSalary: 12000,
  unusedLeaveDays: 15,
  unpaidWorkedDays: 22,
};

function run(overrides: Partial<SettlementInput> = {}): SettlementResult {
  const r = calculateSettlement({ ...A1, ...overrides });
  if (!r.ok) throw new Error(JSON.stringify(r.errors));
  return r;
}
const line = (r: SettlementResult, key: string) => r.lines.find((l) => l.key === key)?.amount;

describe('dates', () => {
  it('rejects impossible dates', () => {
    expect(parseISODate('2025-02-29')).toBeNull();
    expect(parseISODate('2024-02-29')).not.toBeNull();
    expect(parseISODate('22/10/2026')).toBeNull();
  });
  it('counts both ends, across a leap day (A5)', () => {
    expect(daysInclusive(parseISODate('2024-02-28')!, parseISODate('2024-03-01')!)).toBe(3);
  });
  it('computes calendar tenure', () => {
    expect(calendarTenure(parseISODate('2021-06-01')!, parseISODate('2026-10-22')!)).toEqual({ years: 5, months: 4, days: 22 });
    expect(calendarTenure(parseISODate('2025-01-01')!, parseISODate('2025-12-31')!)).toEqual({ years: 1, months: 0, days: 0 });
  });
});

describe('settlement golden case A1', () => {
  const r = run();
  it('service days', () => {
    expect(r.serviceDays).toBe(1970);
    expect(r.netServiceDays).toBe(1970);
  });
  it('line amounts', () => {
    expect(line(r, 'gratuity')).toBe(30224.66);
    expect(r.alternativeGratuity).toBe(29892.52);
    expect(line(r, 'leavePay')).toBe(4000);
    expect(line(r, 'finalWages')).toBe(8800);
    expect(line(r, 'noticeOwedToYou')).toBe(16000);
    expect(r.total).toBe(59024.66);
  });
  it('weekly-wage method', () => {
    expect(line(run({ gratuityMethod: 'weeklyWage' }), 'gratuity')).toBe(29892.52);
  });
  it('notice and leave thresholds', () => {
    expect(r.statutoryNoticeDays).toBe(60);
    expect(r.leaveEntitlementPerYear).toBe(28);
  });
});

describe('eligibility', () => {
  it('A2: 364 days → no gratuity', () => {
    const r = run({ startDate: '2025-01-01', endDate: '2025-12-30' });
    expect(r.serviceDays).toBe(364);
    expect(line(r, 'gratuity')).toBe(0);
    expect(r.warnings).toContain('notEligible');
  });
  it('A3: exactly 365 days → basic/30 × 21', () => {
    const r = run({ startDate: '2025-01-01', endDate: '2025-12-31' });
    expect(line(r, 'gratuity')).toBe(5600);
  });
  it('A4: unpaid leave pushes below one year', () => {
    const r = run({ startDate: '2025-01-01', endDate: '2026-01-15', unpaidLeaveDays: 20 });
    expect(r.serviceDays).toBe(380);
    expect(r.netServiceDays).toBe(360);
    expect(line(r, 'gratuity')).toBe(0);
    expect(r.warnings).toContain('unpaidLeaveExcluded');
  });
});

describe('thresholds', () => {
  it('A6: notice 30 days at exactly 2 years, 60 days after', () => {
    expect(run({ startDate: '2024-01-01', endDate: '2025-12-30' }).statutoryNoticeDays).toBe(30); // 730 days
    expect(run({ startDate: '2024-01-01', endDate: '2025-12-31' }).statutoryNoticeDays).toBe(60); // 731 days
  });
  it('A7: leave 21 below 5 years, 28 at 5 years', () => {
    expect(run({ startDate: '2021-01-01', endDate: '2025-12-29' }).leaveEntitlementPerYear).toBe(21); // 1824 days
    expect(run({ startDate: '2021-01-01', endDate: '2025-12-30' }).leaveEntitlementPerYear).toBe(28); // 1825 days = 5 × 365
  });
  it('contract notice longer than statutory is honoured, capped at 90', () => {
    expect(run({ contractNoticeDays: 75 }).statutoryNoticeDays).toBe(75);
    expect(run({ contractNoticeDays: 30 }).statutoryNoticeDays).toBe(60);
  });
});

describe('end reasons', () => {
  it('A8: resigned without notice, employer claims it', () => {
    const notClaimed = run({ endReason: 'employeeResigned' });
    expect(notClaimed.potentialNoticeClaim).toBe(16000);
    expect(notClaimed.warnings).toContain('potentialNoticeClaim');
    expect(notClaimed.total).toBe(43024.66);
    expect(notClaimed.dueDate).toBe('2026-10-29');
    const claimed = run({ endReason: 'employeeResigned', employerClaimsNotice: true });
    expect(line(claimed, 'noticeClaimedByEmployer')).toBe(-16000);
    expect(claimed.total).toBe(27024.66);
  });
  it('A9: deductions larger than dues', () => {
    const r = run({ endReason: 'contractExpired', deductions: 100000 });
    expect(r.total).toBeLessThan(0);
    expect(r.warnings).toContain('owesEmployer');
  });
  it('A10: fixed-term ended early still uses Art. 49 notice', () => {
    const r = run({ contractType: 'fixed' });
    expect(line(r, 'noticeOwedToYou')).toBe(16000);
    expect(r.warnings).toContain('fixedTermEarly');
  });
  it('A13: Art. 61 dismissal forfeits gratuity and notice, keeps leave', () => {
    const r = run({ endReason: 'art61Dismissal' });
    expect(line(r, 'gratuity')).toBe(0);
    expect(line(r, 'noticeOwedToYou')).toBeUndefined();
    expect(line(r, 'leavePay')).toBe(4000);
    expect(r.totalIfDisputed).toBe(59024.66);
  });
  it('A14: Art. 51 employer breach keeps gratuity, no notice', () => {
    const r = run({ endReason: 'art51EmployerBreach' });
    expect(line(r, 'gratuity')).toBe(30224.66);
    expect(r.statutoryNoticeDays).toBe(0);
  });
  it('A15: probation notice periods', () => {
    const base = { startDate: '2026-06-01', endDate: '2026-10-22', inProbation: true } as const;
    expect(run({ ...base, endReason: 'employerTerminated' }).statutoryNoticeDays).toBe(30);
    expect(run({ ...base, endReason: 'employeeResigned' }).statutoryNoticeDays).toBe(30);
    const leaving = run({ ...base, endReason: 'employeeResigned', probationLeavingTo: 'leavingQatar', agreedProbationNoticeDays: 45 });
    expect(leaving.statutoryNoticeDays).toBe(45);
    expect(leaving.potentialNoticeClaim).toBe(12000);
    expect(leaving.warnings).toContain('probationLeavingQatar');
  });
  it('A16: payment due the day after the contract ends', () => {
    expect(run().dueDate).toBe('2026-10-23');
  });
});

describe('validation (A11)', () => {
  it('rejects bad input without throwing', () => {
    const bad = calculateSettlement({ ...A1, basicSalary: 0, grossSalary: 5, endDate: '2020-01-01', unusedLeaveDays: NaN });
    expect(bad.ok).toBe(false);
    if (!bad.ok) {
      const fields = bad.errors.map((e) => e.field);
      expect(fields).toContain('basicSalary');
      expect(fields).toContain('endDate');
      expect(fields).toContain('unusedLeaveDays');
    }
    expect(calculateSettlement({ ...A1, basicSalary: 1e9 }).ok).toBe(false);
    expect(calculateSettlement({ ...A1, grossSalary: 5000 }).ok).toBe(false);
  });
  it('gross defaults to basic when empty', () => {
    expect(line(run({ grossSalary: 0 }), 'finalWages')).toBe(5866.67);
  });
});

describe('rounding (A12)', () => {
  it('total equals the sum of displayed lines', () => {
    const r = run({ basicSalary: 7777.77, grossSalary: 9999.99, unusedLeaveDays: 13.5, unpaidWorkedDays: 7 });
    const sum = Math.round(r.lines.reduce((s, l) => s + l.amount, 0) * 100) / 100;
    expect(r.total).toBe(sum);
  });
});
