# Qatar Gratuity Hub — Product & Technical Specification (v2)

> Supersedes the original Gemini-generated prompt (removed from the repo; see git history). Written to be handed to a developer or coding model as the single source of truth.
> Every legal rule below carries a status: **[VERIFIED]** (well supported by multiple reputable sources) or **[VERIFY]** (sources conflict or the statute text has not been checked). All [VERIFY] items are tracked in `LEGAL-VERIFY.md` and **must be resolved before public launch**.
> Spec date: 2026-10-22 (legal pass 2 the same day: rules checked against the English text of Law 14/2004 and of Law 18/2020 — see `LEGAL-VERIFY.md`). Law reference: Qatar Labour Law No. 14 of 2004, as amended (incl. Law No. 18 of 2020 and Law No. 9 of 2026, published in the Official Gazette 25 June 2026; implementing decisions for Law 9/2026 still pending). English texts are unofficial translations; the Arabic original prevails.

---

## 0. Ground rules for whoever builds this

1. No placeholders, stubs or `TODO`s in shipped code. A rule whose value is still [VERIFY] is still implemented — using the value given here — and flagged in the UI as "estimate".
2. All legal constants live in **one file**, `src/rules/qatar.ts` (see §3.1). No magic numbers anywhere else. A change in the law must be a one-file edit plus a test update.
3. The calculation engine is pure TypeScript with no DOM, framework or date-library dependency, and has 100% branch coverage.
4. Never present output as "official". Everything is an **estimate**.

---

## 1. Product scope

### 1.1 What it is
A free, bilingual (English / Arabic) static website that lets private-sector employees in Qatar estimate:
- **A. Final settlement** — end-of-service gratuity, leave encashment, final-month wages, notice pay, return ticket, minus deductions.
- **B. Overtime pay** — normal-day, night and rest-day/holiday work.
- **C. "Send it home" converter** — the settlement converted to home currency, with an honest comparison of transfer costs.

### 1.2 Who it does NOT cover (show this before the form, not in the footer)
The calculator applies to private-sector employees under Law No. 14 of 2004. It does **not** apply to (Art. 3 unless noted):
- Ministries, government bodies, public institutions, and companies established by Qatar Petroleum / QatarEnergy alone or with others; anyone whose employment is governed by a special law.
- Armed forces, police, and workers employed at sea.
- Domestic workers (drivers, nurses, cooks, gardeners, etc. — now governed by Law No. 15 of 2017).
- Casual workers (non-core work lasting ≤ 4 weeks), agricultural and grazing workers, and working family members of the employer.
- Part-time and freelance workers (excluded by Law No. 9 of 2026 unless the Council of Ministers extends provisions to them) **[VERIFY article number]**.
- Qatari and GCC nationals covered by the social insurance / pension system.
- Employees of QFC, QSTP or free-zone entities with their own employment regulations.
- Workers in an employer retirement scheme that gives more than the gratuity (Art. 56) — the worker may choose either; show a note, still calculate.

Also show: "The law sets **minimum** entitlements. Any agreement giving you less, or where you waive your statutory rights, is void (Art. 4)."

UI: a short "Does this apply to me?" checklist (3 yes/no questions: private sector? not domestic worker? not on Qatari pension?). If any answer excludes the user, show the reason and still allow them to continue with a persistent "may not apply to you" banner.

### 1.3 Disclaimers (mandatory, both languages)
- "This is an estimate for information only, not legal advice. Your contract, company policy or a court/committee decision may give a different result."
- Link to the **Ministry of Labour** (not "MADLSA" — renamed) complaints and labour-dispute channels. Under Law 9/2026 (amended Art. 115) a dispute goes first to the Ministry for amicable settlement, then to the Labour Dispute Settlement Committee (Art. 115 bis, a committee chaired by a judge).
- "Last legal review: <date>" shown in the footer, driven by a constant in `qatar.ts`.

---

## 2. Tech stack & architecture

| Concern | Choice | Reason |
|---|---|---|
| Framework | **Astro 4/5 (static output) + TypeScript (strict)** | Pre-rendered HTML per page and per language = good SEO, which the whole monetization model depends on. Ships zero JS except the calculator islands. |
| Interactivity | Astro islands using **Preact** (or vanilla TS) | Small bundle; React is unnecessary here. |
| Styling | Tailwind CSS with logical properties (`ps-`, `pe-`, `ms-`, `me-`, `start-`, `end-`) | Automatic RTL mirroring. Never use `pl-`/`pr-`/`left-`/`right-` for layout. |
| Icons | Lucide (tree-shaken, inline SVG) | |
| Fonts | **Self-hosted** Inter (Latin) and Cairo (Arabic), WOFF2, subsetted, `font-display: swap` | No Google Fonts request → simpler CSP and no third-party data transfer. |
| Tests | Vitest (engine), Playwright (one smoke test per page per language) | |
| Hosting | Cloudflare Pages, static only | $0, `_headers` support. |
| PDF | `@media print` stylesheet + `window.print()` | No html2pdf/jsPDF: heavy, and they render Arabic shaping poorly. Browsers' "Save as PDF" handles both scripts correctly. |

### 2.1 Folder layout
```
src/
  rules/qatar.ts            # all legal constants + metadata (§3.1)
  engine/
    dates.ts                # date-only arithmetic (§3.2)
    settlement.ts           # Module A
    overtime.ts             # Module B
    remittance.ts           # Module C math
    money.ts                # rounding + formatting
  engine/__tests__/*.test.ts
  config/monetization.ts    # affiliate partners (§6)
  config/fxFallback.ts      # dated static fallback rates
  i18n/en.json, i18n/ar.json
  components/…              # islands: SettlementForm, Results, PrintSummary, OvertimeForm, Converter
  pages/[lang]/index.astro, gratuity-calculator.astro, overtime-calculator.astro,
        send-money-home.astro, guide/*.astro, privacy.astro, disclaimer.astro
public/_headers, public/_redirects, public/fonts/*
```

### 2.2 Routing & SEO
- Routes: `/en/…` and `/ar/…` with identical slugs. `/` → `/en/` via `_redirects` (static hosting can't negotiate language; show a prominent language switch).
- Each page: `<link rel="alternate" hreflang="en" …>`, `hreflang="ar"`, `hreflang="x-default"`; canonical URL; JSON-LD `WebApplication` + `FAQPage` for guide pages.
- The guide pages (plain-language explanations of Art. 54, notice, leave, overtime) are the SEO surface. Every factual claim there must match `qatar.ts`.

---

## 3. Calculation engine

### 3.1 Rules file (`src/rules/qatar.ts`)
Each rule is an object, not a bare number:
```ts
export interface Rule<T> {
  value: T;
  legalBasis: string;       // e.g. "Law 14/2004 Art. 54"
  verified: boolean;        // false → UI shows "estimate" badge + tooltip
  note?: string;
}

export const RULES = {
  lastLegalReview: '2026-10-22',
  gratuity: {
    minServiceDays:        { value: 365, legalBasis: 'Art. 54', verified: true },
    minWeeksPerYear:       { value: 3,   legalBasis: 'Art. 54', verified: true },
    wageBase:              { value: 'basic', legalBasis: 'Art. 54 + Art. 72 (last basic wage)', verified: true },
    proRataPartYears:      { value: true, legalBasis: 'Art. 54', verified: true },
    employerMayDeductDebts:{ value: true, legalBasis: 'Art. 54', verified: true },
    lostOnArt61Dismissal:  { value: true, legalBasis: 'Art. 61 (10 grounds) + Law 9/2026 strike-incitement ground', verified: true },
    unpaidLeaveExcluded:   { value: true, legalBasis: 'Ministry/HR practice; not stated in Art. 54', verified: false,
                             note: 'Art. 1 says leave and permitted absence do not interrupt continuous service, but does not say whether unpaid days count.' },
  },
  notice: {
    // after probation; applies to any contract since Law 18/2020 replaced Art. 49
    thresholdServiceYears: { value: 2, legalBasis: 'Art. 49 (replaced by Law 18/2020)', verified: true },
    daysUpToThreshold:     { value: 30, legalBasis: 'Art. 49', verified: true },   // "first two years: one month"
    daysAboveThreshold:    { value: 60, legalBasis: 'Art. 49', verified: true },   // "after the first two years: two months"
    wageBase:              { value: 'basic', legalBasis: 'Art. 49 (replaced by Law 18/2020): "worker\'s basic wage"', verified: true },
  },
  probationNotice: {
    maxProbationMonths:    { value: 6, legalBasis: 'Art. 39 (replaced by Law 18/2020)', verified: true },
    employerDays:          { value: 30, legalBasis: 'Art. 39', verified: true },
    workerToNewEmployerDays:{ value: 30, legalBasis: 'Art. 39(1)', verified: true },
    workerLeavingQatarMaxDays:{ value: 60, legalBasis: 'Art. 39(2): as agreed, max 2 months', verified: true },
    wageBase:              { value: 'basic', legalBasis: 'Art. 39', verified: true },
  },
  leave: {
    daysPerYearUnder5:     { value: 21, legalBasis: 'Art. 79', verified: true },
    daysPerYear5Plus:      { value: 28, legalBasis: 'Art. 79', verified: true,
                             note: 'Text says "less than five years" / "more than five years"; exactly 5 years is treated as 28 (worker-favourable).' },
    proRataPartYears:      { value: true, legalBasis: 'Art. 79', verified: true },
    encashmentWageBase:    { value: 'basic', legalBasis: 'Art. 81 (payment in lieu) + Art. 72 (leave pay on basic wage)', verified: true },
  },
  hours: {
    normalDaily:           { value: 8,  legalBasis: 'Art. 73', verified: true },
    normalWeekly:          { value: 48, legalBasis: 'Art. 73', verified: true },
    ramadanDaily:          { value: 6,  legalBasis: 'Art. 73', verified: true },
    ramadanWeekly:         { value: 36, legalBasis: 'Art. 73', verified: true },
    maxDailyIncludingOT:   { value: 10, legalBasis: 'Art. 74', verified: true },
  },
  overtime: {
    dayPremium:            { value: 0.25, legalBasis: 'Art. 74', verified: true },
    nightPremium:          { value: 0.50, legalBasis: 'Art. 74 (21:00–06:00, shift workers excluded)', verified: true },
    nightStart: '21:00', nightEnd: '06:00',
    excludesManagers:      { value: true, legalBasis: 'Art. 76 (responsible positions with employer powers)', verified: true },
    restDayPremium:        { value: 1.50, legalBasis: 'Art. 75', verified: false,
                             note: 'Worker gets another day off AND is paid either the normal rest-day wage or "basic wage plus an increase of not less than 150%". Whether that means 150% or 250% of basic is disputed; we show 150%.' },
    publicHolidayPremium:  { value: 1.50, legalBasis: 'Art. 78 → applies Art. 75', verified: false },
  },
  settlementDeadline: {
    normalDays:            { value: 1, legalBasis: 'Art. 67: before the end of the day after the contract ends', verified: true },
    abandonedWorkMaxDays:  { value: 7, legalBasis: 'Art. 67: worker left without Art. 49 notice', verified: true },
    penalty:               { legalBasis: 'Art. 145 (up to 1 month prison and/or QAR 2,000–6,000 fine)', verified: true },
  },
  repatriation: {
    employerPaysReturn:    { value: true, legalBasis: 'Art. 57', verified: true },
    completeWithinDays:    { value: 14, legalBasis: 'Art. 57', verified: true },
  },
  money: { qarPerUsdPeg: 3.64, maxMonthlySalary: 1_000_000 },
  dates: { min: '1990-01-01', max: '2050-12-31' },
} as const;
```
The UI renders a small "ⓘ estimate" badge next to any result line whose rule has `verified: false`, with the `note`/`legalBasis` in a tooltip.

### 3.2 Date arithmetic (`dates.ts`)
- Inputs are `YYYY-MM-DD` strings. Parse to UTC midnight (`Date.UTC(y, m-1, d)`) — **never** `new Date('2026-10-22')` mixed with local time, and never local-time arithmetic (DST-free in Qatar, but not for every user's device).
- `serviceDaysInclusive(start, end) = (utc(end) − utc(start)) / 86_400_000 + 1`. Both the first and last day count.
- Validation: `start ≤ end`, both within `RULES.dates`, end not more than 1 year in the future (allow planned leaving dates).
- `netServiceDays = max(0, serviceDaysInclusive − unpaidLeaveDays)`.
- `serviceYears = netServiceDays / 365`. **One year length everywhere (365).** Display tenure as "X years, Y months, Z days" using calendar arithmetic, not division.

### 3.3 Money (`money.ts`)
- Calculate in full floating precision; round **each result line** to 2 decimals (half-up) for display; **total = sum of rounded lines** so the printed summary always adds up.
- Formatting: `Intl.NumberFormat(locale, { style: 'currency', currency: 'QAR' })` with locale `en-QA` or **`ar-QA-u-nu-latn`** (Arabic text, Latin digits — what Qatar HR documents and bank statements use; offer an Arabic-Indic digits toggle).

---

## 4. Module A — Final settlement

### 4.1 Inputs
| Field | Type / bounds | Default | Notes |
|---|---|---|---|
| `startDate`, `endDate` | date | — | "Joining date", "Last working day" |
| `contractType` | `indefinite` \| `fixed` | `indefinite` | |
| `endReason` | `employeeResigned` \| `employerTerminated` \| `contractExpired` \| `mutual` \| `art61Dismissal` \| `art51EmployerBreach` | — | Drives notice logic and warnings |
| `inProbation` | boolean | false | Switches to Art. 39 probation notice rules (§4.4) |
| `probationLeavingTo` | `newEmployerInQatar` \| `leavingQatar` | — | Only when `inProbation` and employee resigned |
| `agreedProbationNoticeDays` | 0–60 | 30 | Only for `leavingQatar` |
| `basicSalary` | QAR 0–1,000,000 | — | "Last basic monthly salary, excluding allowances" |
| `grossSalary` | QAR ≥ basic, ≤ 1,000,000 | = basic | "Basic + all fixed allowances (housing, transport, etc.)" |
| `gratuityDaysPerYear` | integer 21–90 | 21 | "Your contract may give more. It can't give less." |
| `gratuityMethod` | `dailyBasic30` \| `weeklyWage` | `dailyBasic30` | §4.2 |
| `unpaidLeaveDays` | 0 – serviceDays | 0 | "Unpaid leave days your employer excludes from service" — excluded from service **[VERIFY]** |
| `unusedLeaveDays` | 0–365, decimals allowed | — | With "Estimate it for me" helper (§4.3) |
| `leaveDayBase` | 30 \| 26 | 30 | 26 only labelled "if your contract says so" |
| `unpaidWorkedDays` | 0–31 | 0 | Days worked in final period not yet paid |
| `noticeDaysServed` | 0–90 | — | Only shown when notice applies |
| `ticketOwed` | QAR 0–50,000 | 0 | Only if the employer is not booking the return trip itself (Art. 57: employer pays return to the place of recruitment, arranged within 2 weeks) |
| `deductions` | QAR 0–1,000,000 | 0 | Documented sums the worker owes the employer (loans, advances). Art. 54 lets the employer deduct these from the gratuity |

### 4.2 Gratuity
```
eligible = netServiceDays ≥ 365
dailyRate (dailyBasic30) = basicSalary / 30
dailyRate (weeklyWage)   = (basicSalary × 12 / 52) / 7
gratuity = eligible ? dailyRate × gratuityDaysPerYear × (netServiceDays / 365) : 0
```
- Label `dailyBasic30` "Common HR method (basic ÷ 30)" and `weeklyWage` "Weekly-wage method (basic × 12 ÷ 52 per week)". Neither is called a "statutory floor"; both are reasonable readings of "three weeks' wage". Show the difference between them when it exceeds QAR 100.
- Not eligible → message: "Gratuity needs at least one full year of service (Art. 54). You can still claim final wages, leave pay and notice pay."
- Resignation does **not** reduce gratuity under Qatari law **[VERIFIED]** — say so, since many users expect UAE-style reductions.
- `endReason = art61Dismissal` → gratuity **0** and no notice pay. Art. 61 lets the employer dismiss without notice and without gratuity, but only on its listed grounds. These include false identity or documents, gross financial loss (reported to the Ministry within 24 h), repeated safety violations after written warning, repeated failure in essential duties after written warning, disclosing secrets, drunkenness/drugs at work, assaulting the employer or a manager, repeated assault on colleagues, absence over 7 consecutive days or 15 days in a year without cause, a final conviction for an offence of dishonesty or immorality, and, from Law 9/2026, unlawfully inciting a disruptive strike. Art. 62 adds procedural safeguards: the charge must be brought within 15 days of the employer knowing, and the worker must be informed and heard in writing. The UI lists these grounds and offers "I dispute this dismissal". That option recalculates as `employerTerminated` and labels the result "what you could claim if the dismissal is overturned".
- `endReason = art51EmployerBreach` → the worker may leave without notice and **keeps full gratuity** (Art. 51). The reasons are: the employer breached the contract or the law, assault, the worker was misled at hiring, a known safety danger the employer didn't fix, or a final Labour Committee decision in the worker's favour. No notice line in either direction.

**Worked example (test golden case A1):** basic 8,000; 2021-06-01 → 2026-10-22; no unpaid leave → 1,970 days, 5.397 years.
`dailyBasic30`: 8000/30 × 21 × 1970/365 = **QAR 30,224.66**. `weeklyWage`: (8000×12/52)/7 × 21 × 1970/365 = **QAR 29,892.52**.

### 4.3 Leave encashment
```
leaveEntitlementPerYear = serviceYears < 5 ? 21 : 28        (Art. 79; display badge only)
leavePay = (basicSalary / leaveDayBase) × unusedLeaveDays    (Art. 81 payment in lieu, at basic wage per Art. 72)
```
The right to leave can't be waived. On termination for **any** reason, untaken leave must be paid (Art. 81). That includes Art. 61 dismissal.
"Estimate it for me" helper: asks for days of leave taken in the current leave year and computes
`accrued = entitlementPerYear × (daysSinceLastAnniversary / 365) − taken` (min 0, 1 decimal), plus any carried-over balance the user enters. The user can always overwrite the number.

Example A1 (15 unused days): 8000/30 × 15 = **QAR 4,000.00**.

### 4.4 Notice pay
Since Law 18/2020 replaced Art. 49, either party may end **any** contract (fixed or indefinite) after probation by giving written notice. Compensation in lieu is the **worker's basic wage** for the notice period or the part not served. It is **not** gross. Gemini's spec and v1 of this spec both had this wrong.

Applies when `endReason ∈ {employeeResigned, employerTerminated}`:
```
if inProbation (Art. 39):
  statutoryNoticeDays = employerTerminated ? 30
                      : probationLeavingTo == newEmployerInQatar ? 30
                      : min(agreedProbationNoticeDays, 60)
else (Art. 49):
  statutoryNoticeDays = serviceYears ≤ 2 ? 30 : 60       (contract may be longer — allow override up to 90)
shortfallDays = max(0, statutoryNoticeDays − noticeDaysServed)
noticeAmount  = (basicSalary / 30) × shortfallDays
```
- `employerTerminated` → **added** to the settlement ("Notice pay owed to you").
- `employeeResigned` → shown as a **possible deduction** ("If you leave without serving full notice, your employer may claim this amount"). It counts in the total only when the user ticks "My employer is claiming this". Also show Art. 67's 7-day payment window for workers who left without notice.
- Probation, worker moving to a new employer in Qatar: note that the *new* employer may have to compensate the old one for part of the recruitment fees and ticket, capped at 2 months' basic wage (Art. 39). The worker doesn't pay this.
- Probation, worker leaving Qatar without honouring notice: note the one-year work-permit ban (Art. 39/49).
- Fixed-term contract ended early with notice: calculate as above. Add the note "Your contract may give you extra rights for the unexpired term; this tool doesn't calculate them" **[VERIFY — no Labour Law formula found]**.
- `contractExpired` / `mutual` / `art61Dismissal` / `art51EmployerBreach` → no notice line.

Example A1 (employer terminated, 0 days served, basic 8,000): 5.4 yrs > 2 → 60 days → 8000/30 × 60 = **QAR 16,000.00**.

### 4.5 Final-period wages
`finalWages = (grossSalary / 30) × unpaidWorkedDays`. Example A1 (22 days): **QAR 8,800.00**.

### 4.6 Total
```
total = gratuity + leavePay + finalWages + (noticeOwedToEmployee) + ticketOwed
        − deductions − (noticeClaimedByEmployer if ticked)
```
If `total < 0`, show it as "You may owe your employer QAR X" rather than a negative number.

Example A1 total (employer terminated, no ticket/deductions): 30,224.66 + 4,000.00 + 8,800.00 + 16,000.00 = **QAR 59,024.66**.

### 4.7 Payment timing banner
> "Under Article 67 of the Labour Law, your employer must pay your wages and all final dues **before the end of the day after your contract ends**. If you left without giving notice, they have up to **7 days**. Late payment is a criminal offence (Art. 145). If you aren't paid, you can file a complaint with the Ministry of Labour."

Show the computed due date from `endDate`, e.g. "Due by: 23 Oct 2026".

### 4.8 Results UI
- Each line: label, amount, a "How was this calculated?" disclosure showing the formula with the user's own numbers substituted, and the `legalBasis`.
- "estimate" badge on any line backed by an unverified rule.
- Buttons: **Print / Save as PDF**, **Convert to my currency** (scrolls to Module C with the total pre-filled).

### 4.9 Print summary ("Estimated Settlement Summary")
- Title: "Estimated Final Settlement Summary" — **never** "Official".
- Optional, local-only text fields: "Your name / reference", "Employer name" (max 80 chars each, rendered via text nodes only, never `innerHTML`). Lock note: "Only used to print this page. Not saved or sent anywhere."
- Content: inputs used, each line with formula, total, generated-on date, `lastLegalReview` date, disclaimer, site URL.
- `@media print`: A4, hides nav/ads/affiliate blocks/buttons, keeps `dir` of the current language, fits on one page for the default case.

---

## 5. Module B — Overtime

### 5.1 Inputs
`basicSalary`; `schedule` (`normal` 8h/48h or `ramadan` 6h/36h); `hourlyMethod` (`daily30` default | `weekly`); `dayOTHours`; `nightOTHours`; `restDayHours`; `publicHolidayHours`; `isShiftWorker` (boolean — the night premium and the Friday rest-day rule don't apply, Art. 74/75); `isManager` (boolean — "a responsible position with employer powers over workers": Arts. 73–75 don't apply at all (Art. 76), so show a message instead of results).

All premiums are on the **basic** wage (Art. 74/75).

### 5.2 Formulas
```
hourly (daily30) = basicSalary / (30 × dailyHours)
hourly (weekly)  = (basicSalary × 12 / 52) / weeklyHours
dayOT     = hourly × (1 + 0.25) × dayOTHours
nightOT   = hourly × (1 + 0.50) × nightOTHours          (if !isShiftWorker; else at day rate + note)
restDay   = hourly × 1.50 × restDayHours                 [VERIFY — see note]
holiday   = hourly × 1.50 × publicHolidayHours           [VERIFY — Art. 78 applies Art. 75]
```
- Rest-day note shown in UI: "Article 75 says you must get another day off **and** be paid either your normal rest-day wage or your basic wage plus at least 150%. Experts disagree on whether that means 150% or 250% of basic pay. We show the lower figure."
- Public holidays (Art. 78): 10 paid days a year — 3 Eid al-Fitr, 3 Eid al-Adha, 1 National Day, 3 chosen by the employer.
- No more than two consecutive Fridays worked (except shift workers, Art. 75). If `restDayHours` covers more than 2 Fridays in a row, show a warning.
- Validation warning (not a block) if `dayOT + nightOT` implies more than 2 hours OT per working day on average (10-hour daily cap, Art. 74). Ask for "number of working days in the period" to check.

Example B1: basic 8,000, normal schedule → hourly 8000/240 = 33.33; 10 day-OT hours = **QAR 416.67**; 5 night hours = **QAR 250.00**.

---

## 6. Module C — Send it home (monetization)

### 6.1 Converter
- Amount: pre-filled from Module A total, or entered.
- Currencies: INR, PHP, PKR, BDT, NPR, LKR, EGP, KES, GBP, USD, EUR.
- Rates: fetch `https://open.er-api.com/v6/latest/QAR` once per session; cache in `sessionStorage` (try/catch); on failure use `config/fxFallback.ts` and show "Offline reference rates from <date>". Always show the rate source and time. USD always derived from the 3.64 peg.

### 6.2 Honest cost comparison
Replace the Gemini spec's invented "~2.2% + QAR 15–35" figures with a **user-driven** comparison:
1. Show the mid-market amount the recipient would get.
2. "What rate did your bank or exchange house quote?" → user types the quoted rate and fee → show "Hidden cost vs mid-market: QAR X (Y%)".
3. If no quote is entered, show an example with the clearly labelled assumption "Example: a 2% rate markup + QAR 20 fee", editable.

### 6.3 Partners (`config/monetization.ts`)
```ts
export interface Partner {
  id: string; name: string; url: string;               // full affiliate URL incl. utm_*
  corridors: string[];                                  // currencies supported FROM QAR
  qatarSenderSupport: 'confirmed' | 'unconfirmed';
  confirmedOn?: string;                                  // date checked
}
```
- Only partners with `qatarSenderSupport: 'confirmed'` and a matching corridor are shown. Status as of 2026-10-22 (`LEGAL-VERIFY.md` B1):
  - **Western Union**: confirmed. It has a Qatar site and app, works through Alfardan Exchange, takes a Qatar debit card or cash at agents, and advertises an online fee around QAR 15–20. Online limits are **QAR 34,500 per transfer and QAR 50,000 per week**.
  - **WorldRemit**: confirmed sending from Qatar by card, to 130+ countries.
  - **Wise**: not confirmed. No evidence that Qatar residents can send from QAR. Don't list it.
  - **Remitly**: not confirmed. Don't list it.
  - Still to check: local exchange houses and bank apps, and whether each one runs an affiliate programme.
- Because settlements often exceed per-transfer limits, the converter shows "Your amount may need N transfers with this provider" when the amount is over a partner's `maxPerTransferQAR` (add this field).
- Do not invent tracking params: `impact_click_id` etc. are appended by the network at click time. Store only the network-issued link.
- Links: `rel="sponsored noopener noreferrer"`, `target="_blank"`.
- Affiliate disclosure next to the partner cards and on the privacy page: "We may earn a commission if you use these links. It doesn't change the price you pay."
- No "You'll save QAR X with Partner" claims unless the figure comes from the partner's own published pricing for that corridor and date.

### 6.4 Display ads
**Launch without display ads.** Third-party ad scripts set cookies, receive user data and require a consent banner, which would make the "nothing leaves your device" promise false. If ads are added later: consent banner first (reject = no ad script loaded), per-network CSP additions, updated privacy page, reserved fixed-size ad slots (no layout shift) that never appear inside the form or print view.

---

## 7. Internationalisation

- `<html lang="en" dir="ltr">` / `<html lang="ar" dir="rtl">` set at build time per route (no runtime flip → no layout flash).
- All strings from `i18n/{en,ar}.json`; a CI check fails if the key sets differ. Arabic text must be written/reviewed by a native speaker, especially legal terms (e.g. مكافأة نهاية الخدمة, الأجر الأساسي, مهلة الإنذار).
- Numbers inside Arabic text wrapped in `<bdi>` so currency amounts don't reorder.
- Directional icons (arrows) mirrored with `rtl:` variants; the calculator layout uses logical properties only.
- Date inputs use native `<input type="date">`; displayed dates use `Intl.DateTimeFormat(locale, { calendar: 'gregory' })`.
- The only thing ever written to `localStorage` is the language choice and digit preference.

---

## 8. Privacy & security

### 8.1 Data
- No backend. Inputs live in component state only; nothing is sent anywhere. The only network request the app makes is the exchange-rate fetch, which sends no user data.
- No fields for QID, passport, phone, email or IBAN.
- No analytics at launch. If added later: Cloudflare Web Analytics only (cookieless), with its two domains added to the CSP and mentioned on the privacy page — never send input values or results as events.
- Wording on site: **"We don't collect or store your data. Calculations happen in your browser."** Don't claim "certified PDPPL compliant".

### 8.2 Input handling
- Numeric inputs: parse with `Number()`, reject `NaN`/`Infinity`, clamp to the bounds in §4.1, show inline errors (never silently change the user's value).
- Text fields (print labels): rendered as text nodes only; strip control characters; max 80 chars.
- No `innerHTML`, `dangerouslySetInnerHTML`, `eval` or inline event handlers anywhere (enforced by lint rule).

### 8.3 `public/_headers`
```
/*
  Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data:; connect-src 'self' https://open.er-api.com; manifest-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; upgrade-insecure-requests
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()
  Cross-Origin-Opener-Policy: same-origin

/fonts/*
  Cache-Control: public, max-age=31536000, immutable
/_astro/*
  Cache-Control: public, max-age=31536000, immutable
```
- No `'unsafe-inline'`. Configure Astro so nothing is inlined: `build.inlineStylesheets: 'never'` and `vite.build.assetsInlineLimit: 0`; no inline `<script>`/`style=""`. Verify in the built HTML.
- Add `preload` to HSTS (and submit to hstspreload.org) only once the final domain and all subdomains are permanently HTTPS.

---

## 9. Accessibility & performance
- WCAG 2.2 AA: every input has a visible `<label>`, errors linked via `aria-describedby`, results region `aria-live="polite"`, full keyboard use, 4.5:1 contrast (check Qatar maroon `#8A1538` on white for text — passes; on dark backgrounds use a lighter tint).
- Results update on input (debounced 150 ms), no "Calculate" button required — but keep one for screen-reader users.
- Budgets: < 50 KB JS gzipped per page, LCP < 2 s on mid-range Android over 4G, CLS < 0.05.

---

## 10. Test matrix (Vitest, `engine/__tests__`)
| ID | Case | Expectation |
|---|---|---|
| A1 | Worked example §4 | Gratuity 30,224.66 / 29,892.52; leave 4,000; wages 8,800; notice 16,000 (basic); total 59,024.66 |
| A13 | Art. 61 dismissal, 5 years | Gratuity 0, no notice, leave still paid; "dispute" toggle shows employerTerminated figures |
| A14 | Art. 51 employer breach | Full gratuity, no notice line |
| A15 | Probation: employer ends / worker → new employer / worker leaving Qatar with 45 agreed days | 30 / 30 / 45 days on basic |
| A16 | Payment due date | endDate + 1 day; resigned without notice → endDate + 7 days |
| B3 | `isManager` | No OT results, Art. 76 message |
| A2 | 364 net days | Not eligible, gratuity 0, message shown |
| A3 | Exactly 365 net days (e.g. 2025-01-01 → 2025-12-31) | Eligible, gratuity = basic/30 × 21 |
| A4 | 380 days with 20 days unpaid leave | 360 net → not eligible |
| A5 | Service spanning 29 Feb | Inclusive day count correct |
| A6 | Service exactly 2 years vs 2 years + 1 day | Notice 30 vs 60 days |
| A7 | 4.99 vs 5.00 years | Leave badge 21 vs 28 |
| A8 | Resigned, 0 notice served, employer claims | Notice shown as deduction, total reduced |
| A9 | Deductions > dues | "You may owe your employer" output |
| A10 | Fixed-term, ended early by employer | Art. 49 notice applies, plus "unexpired term" note |
| A11 | Basic 0 / gross < basic / NaN / 1e9 | Validation errors, no crash |
| A12 | Rounding | Total equals sum of displayed lines |
| B1 | Overtime example §5 | 416.67 / 250.00 |
| B2 | Ramadan schedule | Hourly = basic / 180 |
| C1 | Fetch fails | Fallback rates used, labelled |
| C2 | User-quoted bank rate | Hidden cost computed correctly |
| I1 | Arabic route | `dir="rtl"`, all keys present, Latin digits by default |

Playwright: load each page in both languages, fill the A1 example, assert the total, trigger print media emulation and assert the summary fits on one A4 page.

---

## 11. Launch checklist
1. All `LEGAL-VERIFY.md` items resolved, or explicitly left as "estimate" with the UI badge.
2. Arabic copy reviewed by a native speaker.
3. Each affiliate partner's Qatar availability confirmed and dated.
4. `_headers` checked with a CSP evaluator and securityheaders.com.
5. Lighthouse ≥ 95 on Performance, Accessibility, Best Practices, SEO for `/en/` and `/ar/`.
