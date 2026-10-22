import {
  calculateSettlement,
  DEFAULT_INPUT,
  type EndReason,
  type SettlementInput,
  type SettlementResult,
  type WarningKey,
} from '../engine/settlement';
import { RULES } from '../rules/qatar';
import type { DictKey } from '../i18n/en';
import { date, el, formula, lawLink, money, num, t } from './client-i18n';

const form = document.getElementById('settlement-form') as HTMLFormElement | null;

if (form) {
  const field = <T extends HTMLElement = HTMLInputElement>(name: string) => form.elements.namedItem(name) as T | null;
  const out = (name: string) => document.querySelector<HTMLElement>(`[data-out="${name}"]`)!;
  const wrap = (name: string) => form.querySelector<HTMLElement>(`[data-wrap="${name}"]`);

  const numberOr = (name: string, fallback: number): number => {
    const input = field(name);
    if (!input || input.value.trim() === '') return fallback;
    return Number(input.value);
  };
  const checked = (name: string) => Boolean(field<HTMLInputElement>(name)?.checked);
  const value = (name: string) => field<HTMLInputElement | HTMLSelectElement>(name)?.value ?? '';

  function readInput(): SettlementInput {
    return {
      ...DEFAULT_INPUT,
      startDate: value('startDate'),
      endDate: value('endDate'),
      contractType: value('contractType') as SettlementInput['contractType'],
      endReason: value('endReason') as EndReason,
      inProbation: checked('inProbation'),
      probationLeavingTo: value('probationLeavingTo') as SettlementInput['probationLeavingTo'],
      agreedProbationNoticeDays: numberOr('agreedProbationNoticeDays', 30),
      basicSalary: numberOr('basicSalary', 0),
      grossSalary: numberOr('grossSalary', 0),
      gratuityDaysPerYear: numberOr('gratuityDaysPerYear', RULES.gratuity.minDaysPerYear.value),
      gratuityMethod: value('gratuityMethod') as SettlementInput['gratuityMethod'],
      unpaidLeaveDays: numberOr('unpaidLeaveDays', 0),
      unusedLeaveDays: numberOr('unusedLeaveDays', 0),
      leaveDayBase: value('leaveDayBase') === '26' ? 26 : 30,
      unpaidWorkedDays: numberOr('unpaidWorkedDays', 0),
      noticeDaysServed: numberOr('noticeDaysServed', 0),
      contractNoticeDays: numberOr('contractNoticeDays', 0),
      employerClaimsNotice: checked('employerClaimsNotice'),
      ticketOwed: numberOr('ticketOwed', 0),
      deductions: numberOr('deductions', 0),
    };
  }

  function setVisible(node: HTMLElement | null, visible: boolean) {
    if (node) node.hidden = !visible;
  }

  function updateVisibility(input: SettlementInput) {
    const noticeApplies = input.endReason === 'employeeResigned' || input.endReason === 'employerTerminated';
    const resigned = input.endReason === 'employeeResigned';
    setVisible(wrap('probationLeavingTo'), input.inProbation && resigned);
    setVisible(wrap('agreedProbationNoticeDays'), input.inProbation && resigned && input.probationLeavingTo === 'leavingQatar');
    setVisible(wrap('noticeStep'), noticeApplies);
    setVisible(wrap('contractNoticeDays'), !input.inProbation);
    setVisible(wrap('employerClaimsNotice'), resigned);
  }

  function clearErrors() {
    for (const p of form!.querySelectorAll<HTMLElement>('[data-error-for]')) {
      p.hidden = true;
      p.textContent = '';
    }
    for (const input of form!.querySelectorAll('[aria-invalid]')) input.removeAttribute('aria-invalid');
  }

  function showError(name: string, key: DictKey) {
    const p = form!.querySelector<HTMLElement>(`[data-error-for="${name}"]`);
    if (p) {
      p.textContent = t(key);
      p.hidden = false;
    }
    field(name)?.setAttribute('aria-invalid', 'true');
  }

  const warningText = (w: WarningKey, r: SettlementResult) =>
    w === 'potentialNoticeClaim'
      ? t('w.potentialNoticeClaim', { days: r.statutoryNoticeDays, amount: money(r.potentialNoticeClaim) })
      : t(`w.${w}` as DictKey);

  function renderEmpty() {
    out('total').textContent = '—';
    out('service').textContent = '';
    out('empty').hidden = false;
    out('lines').replaceChildren();
    out('warnings').replaceChildren();
    out('due').classList.add('hidden');
    out('actions').classList.add('hidden');
    out('sticky').hidden = true;
  }

  let last: { input: SettlementInput; result: SettlementResult } | null = null;

  function renderResult(input: SettlementInput, r: SettlementResult) {
    last = { input, result: r };
    out('empty').hidden = true;
    out('totalLabel').textContent = r.total < 0 ? t('res.owe') : t('res.total');
    out('total').textContent = money(Math.abs(r.total));
    out('sticky').hidden = false;
    out('stickyLabel').textContent = out('totalLabel').textContent;
    out('stickyTotal').textContent = out('total').textContent;
    out('service').textContent = t('res.service', {
      y: r.tenure.years,
      m: r.tenure.months,
      d: r.tenure.days,
      days: num(r.netServiceDays),
    });

    const lines = r.lines.map((line) => {
      const li = el('li', 'py-3');
      const row = el('div', 'flex items-baseline justify-between gap-3');
      const label = el('span', 'text-sm font-semibold', t(`line.${line.key}` as DictKey));
      if (line.estimate) {
        const badge = el('span', 'badge-estimate', t('res.estimate'));
        badge.title = t('res.estimateTip');
        label.append(badge);
      }
      const amount = el('span', `num font-bold ${line.amount < 0 ? 'text-red-700 dark:text-red-300' : ''}`, money(line.amount));
      row.append(label, amount);
      const how = el('details', 'mt-1 text-xs text-muted');
      how.append(el('summary', 'cursor-pointer', t('res.how')));
      const f = el('p', 'num mt-1', `${formula(line.formula)} = ${money(Math.abs(line.amount))}`);
      f.dir = 'ltr';
      const basis = el('p', 'mt-0.5');
      basis.append(lawLink(line.legalBasis));
      how.append(f, basis);
      li.append(row, how);
      return li;
    });
    out('lines').replaceChildren(...lines);

    const notes: HTMLElement[] = r.warnings.map((w) => el('p', 'warn', warningText(w, r)));
    if (r.alternativeGratuity > 0 && Math.abs(r.alternativeGratuity - (r.lines[0]?.amount ?? 0)) >= 100) {
      notes.push(el('p', 'text-xs text-muted', t('res.altMethod', { amount: money(r.alternativeGratuity) })));
    }
    if (r.totalIfDisputed !== null) notes.push(el('p', 'note', t('res.disputed', { amount: money(r.totalIfDisputed) })));
    out('warnings').replaceChildren(...notes);

    const leftWithoutNotice = input.endReason === 'employeeResigned' && r.noticeShortfallDays > 0;
    out('dueText').textContent = t(leftWithoutNotice ? 'res.dueBodyNoNotice' : 'res.dueBody', { date: date(r.dueDate) });
    out('due').classList.remove('hidden');
    out('actions').classList.remove('hidden');

    const leaveHint = form!.querySelector<HTMLElement>('[data-hint-for="unusedLeaveDays"]');
    if (leaveHint) leaveHint.textContent = t('h.unusedLeaveDays', { days: r.leaveEntitlementPerYear });
    const noticeHint = form!.querySelector<HTMLElement>('[data-hint-for="noticeDaysServed"]');
    if (noticeHint) noticeHint.textContent = r.statutoryNoticeDays ? t('h.noticeDaysServed', { days: r.statutoryNoticeDays }) : '';

    document.dispatchEvent(new CustomEvent('settlement:total', { detail: Math.max(0, r.total) }));
  }

  function update() {
    const input = readInput();
    updateVisibility(input);
    clearErrors();
    if (!input.startDate || !input.endDate || !(input.basicSalary > 0)) {
      last = null;
      renderEmpty();
      document.dispatchEvent(new CustomEvent('settlement:total', { detail: 0 }));
      return;
    }
    const result = calculateSettlement(input);
    if (!result.ok) {
      for (const e of result.errors) showError(e.field, `err.${e.key}` as DictKey);
      last = null;
      renderEmpty();
      return;
    }
    renderResult(input, result);
  }

  let timer: number | undefined;
  const schedule = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(update, 150);
  };
  form.addEventListener('input', schedule);
  form.addEventListener('change', schedule);
  form.addEventListener('reset', () => window.setTimeout(update, 0));
  document.addEventListener('settlement:request', () =>
    document.dispatchEvent(new CustomEvent('settlement:total', { detail: Math.max(0, last?.result.total ?? 0) })),
  );
  update();

  // Print summary
  const printArea = document.getElementById('print-area')!;
  const pa = (name: string) => printArea.querySelector<HTMLElement>(`[data-print="${name}"]`)!;
  const cell = (text: string, bold = false, end = false) =>
    el('td', [bold && 'pr-strong', end && 'pr-end'].filter(Boolean).join(' '), text);
  const row = (...cells: HTMLTableCellElement[]) => {
    const tr = el('tr');
    tr.append(...cells);
    return tr;
  };
  const clean = (s: string) => s.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 80);
  const selectedText = (name: string) => {
    const s = field<HTMLSelectElement>(name);
    return s?.selectedOptions[0]?.textContent ?? '';
  };

  document.getElementById('btn-print')?.addEventListener('click', () => {
    if (!last) return;
    const { input, result: r } = last;
    const name = clean((document.getElementById('print-name') as HTMLInputElement).value);
    const employer = clean((document.getElementById('print-employer') as HTMLInputElement).value);
    const meta = pa('meta');
    meta.replaceChildren();
    if (name) meta.append(el('p', '', `${t('print.name').replace(/\s*\(.*\)$/, '')}: ${name}`));
    if (employer) meta.append(el('p', '', `${t('print.employer').replace(/\s*\(.*\)$/, '')}: ${employer}`));

    const inputs: [string, string][] = [
      [t('f.startDate'), date(input.startDate)],
      [t('f.endDate'), date(input.endDate)],
      [t('f.endReason'), selectedText('endReason')],
      [t('f.contractType'), selectedText('contractType')],
      [t('f.basicSalary'), money(input.basicSalary)],
      [t('f.grossSalary'), money(input.grossSalary || input.basicSalary)],
      [t('res.service', { y: r.tenure.years, m: r.tenure.months, d: r.tenure.days, days: num(r.netServiceDays) }), ''],
    ];
    pa('inputs').replaceChildren(...inputs.map(([k, v]) => row(cell(k), cell(v, false, true))));

    const lines = r.lines.map((l) =>
      row(cell(`${t(`line.${l.key}` as DictKey)} — ${formula(l.formula)} (${l.legalBasis})`), cell(money(l.amount), true, true)),
    );
    lines.push(row(cell(r.total < 0 ? t('res.owe') : t('res.total'), true), cell(money(Math.abs(r.total)), true, true)));
    pa('lines').replaceChildren(...lines);

    const leftWithoutNotice = input.endReason === 'employeeResigned' && r.noticeShortfallDays > 0;
    const notes = [
      t(leftWithoutNotice ? 'res.dueBodyNoNotice' : 'res.dueBody', { date: date(r.dueDate) }),
      ...r.warnings.map((w) => warningText(w, r)),
    ];
    pa('notes').replaceChildren(...notes.map((n) => el('p', '', `• ${n}`)));
    const today = new Date().toISOString().slice(0, 10);
    pa('generated').textContent = t('print.generated', { date: date(today), review: date(RULES.lastLegalReview) });
    window.print();
  });
}
