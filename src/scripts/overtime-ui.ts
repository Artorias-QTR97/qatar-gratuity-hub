import { calculateOvertime, DEFAULT_OVERTIME, type OvertimeInput } from '../engine/overtime';
import type { DictKey } from '../i18n/en';
import { el, formula, money, num, t } from './client-i18n';

const form = document.getElementById('overtime-form') as HTMLFormElement | null;

if (form) {
  const field = (name: string) => form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null;
  const out = (name: string) => document.querySelector<HTMLElement>(`[data-ot="${name}"]`)!;
  const numberOr = (name: string, fallback: number) => {
    const v = field(name)?.value.trim() ?? '';
    return v === '' ? fallback : Number(v);
  };
  const checked = (name: string) => Boolean((field(name) as HTMLInputElement | null)?.checked);

  function readInput(): OvertimeInput {
    return {
      ...DEFAULT_OVERTIME,
      basicSalary: numberOr('basicSalary', 0),
      schedule: field('schedule')?.value === 'ramadan' ? 'ramadan' : 'normal',
      hourlyMethod: field('hourlyMethod')?.value === 'weekly' ? 'weekly' : 'daily30',
      dayOTHours: numberOr('dayOTHours', 0),
      nightOTHours: numberOr('nightOTHours', 0),
      restDayHours: numberOr('restDayHours', 0),
      publicHolidayHours: numberOr('publicHolidayHours', 0),
      workingDays: numberOr('workingDays', 0),
      isShiftWorker: checked('isShiftWorker'),
      isManager: checked('isManager'),
    };
  }

  function clearErrors() {
    for (const p of form!.querySelectorAll<HTMLElement>('[data-error-for]')) p.hidden = true;
    for (const input of form!.querySelectorAll('[aria-invalid]')) input.removeAttribute('aria-invalid');
  }

  function update() {
    const input = readInput();
    const hours = form!.querySelector<HTMLElement>('[data-wrap="hoursStep"]');
    if (hours) hours.hidden = input.isManager;
    clearErrors();
    out('lines').replaceChildren();
    out('warnings').replaceChildren();
    out('hourly').textContent = '';
    out('total').textContent = '—';

    if (!input.isManager && !(input.basicSalary > 0)) {
      out('empty').hidden = false;
      return;
    }
    out('empty').hidden = true;
    const r = calculateOvertime(input);
    if (!r.ok) {
      for (const e of r.errors) {
        const p = form!.querySelector<HTMLElement>(`[data-error-for="${e.field}"]`);
        if (p) {
          p.textContent = t(`err.${e.key}` as DictKey);
          p.hidden = false;
        }
        field(e.field)?.setAttribute('aria-invalid', 'true');
      }
      return;
    }
    if (r.notApplicable) {
      out('warnings').replaceChildren(el('p', 'warn', t('ot.notApplicable')));
      return;
    }
    out('total').textContent = money(r.total);
    out('hourly').textContent = `${t('ot.hourly')}: ${money(r.hourlyRate)}`;
    out('lines').replaceChildren(
      ...r.lines.map((line) => {
        const li = el('li', 'py-3');
        const row = el('div', 'flex items-baseline justify-between gap-3');
        const label = el('span', 'text-sm font-semibold', t(`ot.line.${line.key}` as DictKey));
        if (line.estimate) {
          const badge = el('span', 'badge-estimate', t('res.estimate'));
          badge.title = t('res.estimateTip');
          label.append(badge);
        }
        row.append(label, el('span', 'num font-bold', money(line.amount)));
        const detail = el('p', 'num text-xs text-muted mt-1', `${formula(line.formula)} = ${money(line.amount)}`);
        detail.dir = 'ltr';
        li.append(
          row,
          el('p', 'text-xs text-muted mt-1', t('ot.hours', { hours: num(line.hours), mult: num(line.multiplier) })),
          detail,
          el('p', 'text-xs text-muted', line.legalBasis),
        );
        return li;
      }),
    );
    const warnings = r.warnings.map((w) => el('p', 'warn', t(w === 'shiftNoNightPremium' ? 'ot.w.shift' : 'ot.w.cap')));
    out('warnings').replaceChildren(...warnings);
  }

  let timer: number | undefined;
  const schedule = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(update, 150);
  };
  form.addEventListener('input', schedule);
  form.addEventListener('change', schedule);
  update();
}
