import { FX_FALLBACK } from '../config/fxFallback';
import { partnersFor } from '../config/monetization';
import { transferCost, transfersNeeded } from '../engine/remittance';
import { currency, date, el, money, num, t } from './client-i18n';

const amountInput = document.getElementById('fx-amount') as HTMLInputElement | null;

if (amountInput) {
  const currencySelect = document.getElementById('fx-currency') as HTMLSelectElement;
  const quotedInput = document.getElementById('fx-quoted') as HTMLInputElement;
  const feeInput = document.getElementById('fx-fee') as HTMLInputElement;
  const q = (name: string) => document.querySelector<HTMLElement>(`[data-fx="${name}"]`)!;

  const CACHE_KEY = 'qsh:fx';
  let rates: Record<string, number> = FX_FALLBACK.rates;
  let ratesDate = FX_FALLBACK.asOf;
  let live = false;
  let userEditedAmount = false;

  function readCache(): { rates: Record<string, number>; date: string } | null {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  async function loadRates() {
    const cached = readCache();
    if (cached) {
      rates = cached.rates;
      ratesDate = cached.date;
      live = true;
      return;
    }
    try {
      const res = await fetch('https://open.er-api.com/v6/latest/QAR', { referrerPolicy: 'no-referrer' });
      if (!res.ok) return;
      const body = await res.json();
      if (body?.result !== 'success' || typeof body.rates !== 'object') return;
      const usable = Object.fromEntries(
        Object.entries(body.rates as Record<string, unknown>).filter(([, v]) => typeof v === 'number' && Number.isFinite(v) && v > 0),
      ) as Record<string, number>;
      rates = usable;
      ratesDate = new Date(Number(body.time_last_update_unix) * 1000).toISOString().slice(0, 10);
      live = true;
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ rates, date: ratesDate }));
      } catch {
        /* storage unavailable */
      }
    } catch {
      /* offline: keep fallback rates */
    }
  }

  function render() {
    const amount = Number(amountInput!.value);
    const code = currencySelect.value;
    const rate = rates[code] ?? FX_FALLBACK.rates[code];
    q('rate').textContent = rate ? t('fx.rateLine', { rate: num(rate, 4), cur: code }) : '';
    q('source').textContent = live ? t('fx.source', { date: date(ratesDate) }) : t('fx.fallback', { date: date(ratesDate) });
    q('mid').textContent = amount > 0 && rate ? currency(amount * rate, code) : '—';

    const cost = transferCost(amount, rate, Number(quotedInput.value), Number(feeInput.value || 0));
    q('quote').classList.toggle('hidden', !cost || !quotedInput.value);
    if (cost) {
      q('quoteReceive').textContent = currency(cost.quotedReceive, code);
      q('quoteCost').textContent = t('fx.cost', { amount: money(cost.costQAR), pct: num(cost.costPercent) });
    }

    const partners = partnersFor(code);
    q('partners').replaceChildren(
      ...partners.map((p) => {
        const li = el('li', 'card p-4 flex flex-wrap items-center justify-between gap-3');
        const info = el('div');
        info.append(el('p', 'font-bold', p.name));
        if (p.maxPerTransferQAR) {
          info.append(el('p', 'text-xs text-muted', t('fx.limit', { amount: money(p.maxPerTransferQAR) })));
          const n = transfersNeeded(amount, p.maxPerTransferQAR);
          if (n > 1) info.append(el('p', 'text-xs font-semibold text-maroon-ink', t('fx.splits', { n })));
        }
        const link = el('a', 'btn btn-primary text-sm', `${t('fx.visit', { name: p.name })} ↗`);
        link.href = p.url;
        link.target = '_blank';
        link.rel = p.isAffiliate ? 'sponsored noopener noreferrer' : 'noopener noreferrer';
        li.append(info, link);
        return li;
      }),
    );
    q('disclosure').hidden = !partners.some((p) => p.isAffiliate);
  }

  amountInput.addEventListener('input', () => {
    userEditedAmount = true;
    render();
  });
  for (const input of [currencySelect, quotedInput, feeInput]) input.addEventListener('input', render);

  document.addEventListener('settlement:total', (event) => {
    const total = (event as CustomEvent<number>).detail;
    if (!userEditedAmount) {
      amountInput.value = total > 0 ? String(total) : '';
      render();
    }
  });
  document.getElementById('btn-convert')?.addEventListener('click', () => {
    userEditedAmount = false;
    document.dispatchEvent(new CustomEvent('settlement:request'));
  });

  render();
  loadRates().then(render);
}
