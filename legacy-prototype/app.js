'use strict';

(function () {
  const FIELD_IDS = [
    'basicSalary',
    'fullSalary',
    'startDate',
    'endDate',
    'unusedLeave',
    'workedDays',
    'unpaidDays',
    'gratuityRate'
  ];

  const QAR_TO_USD_PEG = 3.64;
  const AVG_BANK_FX_SPREAD = 0.028; // 2.8% average retail bank wire markup

  function formatQAR(amount) {
    const safeAmount = Number.isFinite(amount) ? Math.max(0, Math.round(amount)) : 0;
    return 'QAR ' + safeAmount.toLocaleString('en-US');
  }

  function getNumberValue(id, fallback = 0) {
    const el = document.getElementById(id);
    if (!el) return fallback;
    const parsed = parseFloat(el.value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
  }

  function calculateSettlement() {
    const basic = getNumberValue('basicSalary', 0);
    const full = getNumberValue('fullSalary', basic);
    const unusedLeave = getNumberValue('unusedLeave', 0);
    const workedDays = getNumberValue('workedDays', 0);
    const unpaidDays = getNumberValue('unpaidDays', 0);
    const accrualDaysPerYear = getNumberValue('gratuityRate', 21);

    const startVal = document.getElementById('startDate').value;
    const endVal = document.getElementById('endDate').value;
    const startDate = startVal ? new Date(startVal) : new Date();
    const endDate = endVal ? new Date(endVal) : new Date();

    const rawDiffMs = endDate.getTime() - startDate.getTime();
    const rawDays = Math.floor(rawDiffMs / (1000 * 60 * 60 * 24));
    const netServiceDays = Math.max(0, rawDays - unpaidDays);
    const yearsFloat = netServiceDays / 365.25;

    const wholeYears = Math.floor(netServiceDays / 365);
    const remainingMonths = Math.floor((netServiceDays % 365) / 30);
    document.getElementById('tenureBadge').textContent = `${wholeYears} Yrs, ${remainingMonths} Mos`;

    // 1. Article 54 End-of-Service Gratuity (Requires >= 365 net days)
    let gratuity = 0;
    const warningEl = document.getElementById('ineligibleWarning');
    if (netServiceDays >= 365) {
      warningEl.classList.add('hidden');
      const dailyBasic = basic / 30;
      gratuity = dailyBasic * accrualDaysPerYear * yearsFloat;
    } else {
      warningEl.classList.remove('hidden');
    }

    // 2. Unused Leave Encashment
    const leavePay = (basic / 30) * unusedLeave;

    // 3. Current Month Pro-Rata Worked Days
    const currentMonthPay = (full / 30) * workedDays;

    const grandTotal = gratuity + leavePay + currentMonthPay;
    const usdEquivalent = grandTotal / QAR_TO_USD_PEG;
    const estimatedBankSpreadLoss = Math.max(50, grandTotal * AVG_BANK_FX_SPREAD);

    // Safe textContent updates (Immune to DOM XSS)
    document.getElementById('gratuityOut').textContent = formatQAR(gratuity);
    document.getElementById('leaveOut').textContent = formatQAR(leavePay);
    document.getElementById('salaryOut').textContent =