import { describe, expect, it } from 'vitest';
import { calculateOvertime, DEFAULT_OVERTIME } from '../overtime';
import { transferCost, transfersNeeded } from '../remittance';

describe('overtime', () => {
  it('B1: day and night overtime', () => {
    const r = calculateOvertime({ ...DEFAULT_OVERTIME, basicSalary: 8000, dayOTHours: 10, nightOTHours: 5 });
    if (!r.ok || r.notApplicable) throw new Error('unexpected');
    expect(r.hourlyRate).toBe(33.33);
    expect(r.lines.map((l) => l.amount)).toEqual([416.67, 250]);
    expect(r.total).toBe(666.67);
  });
  it('B2: Ramadan hourly rate is basic / 180', () => {
    const r = calculateOvertime({ ...DEFAULT_OVERTIME, basicSalary: 9000, schedule: 'ramadan', dayOTHours: 1 });
    if (!r.ok || r.notApplicable) throw new Error('unexpected');
    expect(r.hourlyRate).toBe(50);
  });
  it('B3: managers are excluded (Art. 76)', () => {
    expect(calculateOvertime({ ...DEFAULT_OVERTIME, basicSalary: 8000, isManager: true })).toEqual({ ok: true, notApplicable: true });
  });
  it('shift workers get no night premium', () => {
    const r = calculateOvertime({ ...DEFAULT_OVERTIME, basicSalary: 8000, nightOTHours: 4, isShiftWorker: true });
    if (!r.ok || r.notApplicable) throw new Error('unexpected');
    expect(r.lines[0].multiplier).toBe(1.25);
    expect(r.warnings).toContain('shiftNoNightPremium');
  });
  it('warns above the 10-hour day', () => {
    const r = calculateOvertime({ ...DEFAULT_OVERTIME, basicSalary: 8000, dayOTHours: 60, workingDays: 26 });
    if (!r.ok || r.notApplicable) throw new Error('unexpected');
    expect(r.warnings).toContain('overDailyCap');
  });
  it('rest day and holiday at 150%', () => {
    const r = calculateOvertime({ ...DEFAULT_OVERTIME, basicSalary: 7200, restDayHours: 8, publicHolidayHours: 8 });
    if (!r.ok || r.notApplicable) throw new Error('unexpected');
    expect(r.lines.map((l) => l.amount)).toEqual([360, 360]);
    expect(r.lines.every((l) => l.estimate)).toBe(true);
  });
  it('rejects missing salary', () => {
    expect(calculateOvertime({ ...DEFAULT_OVERTIME }).ok).toBe(false);
  });
});

describe('remittance', () => {
  it('C2: hidden cost of a quoted rate', () => {
    const r = transferCost(10000, 24, 23.5, 20)!;
    expect(r.midMarketReceive).toBe(240000);
    expect(r.quotedReceive).toBe(234530);
    expect(r.costQAR).toBe(227.92);
    expect(r.costPercent).toBe(2.28);
  });
  it('rejects nonsense', () => {
    expect(transferCost(100, 24, 23, 100)).toBeNull();
    expect(transferCost(NaN, 24, 23, 0)).toBeNull();
  });
  it('splits large amounts', () => {
    expect(transfersNeeded(59024.66, 34500)).toBe(2);
    expect(transfersNeeded(1000, undefined)).toBe(1);
  });
});
