# Legal & Business Verification Checklist

Last pass: **2026-10-22**. Primary texts used:
- **Law No. 14 of 2004** — English translation published by the Qatar Embassy (Washington), copy hosted by Alkarama: `dev.alkarama.org/sites/default/files/2016-11/QTR_LabourLaw_EN_0.pdf`. This is the text *before* the 2020 and 2026 amendments.
- **Law No. 18 of 2020** — unofficial English translation hosted by the ILO (`wcms_754882.pdf`). It replaces Arts. 39, 43, 49, 115 bis, 144, 145 and 145 bis, and adds Art. 51(5), 52 bis and 106 bis.
- **Law No. 9 of 2026** — **full text not obtained.** Only law-firm summaries were available (Crowell, Clyde & Co, K&L Gates, Conventus, QNA).

⚠️ Both English texts are **unofficial translations**; the Arabic original prevails. The official Al Meezan portal (almeezan.qa, Law ID 3961) didn't return readable text to an automated fetch. Before launch, someone who reads Arabic should spot-check the ✅ items on Al Meezan, and the ⚠️/❓ items need a Qatar-licensed lawyer.

Legend: ✅ resolved from statute text · ⚠️ statute text found but ambiguous · ❓ still unverified

## Legal

| ID | Question | Finding | Status |
|---|---|---|---|
| L1 | Does Law 9/2026 change the gratuity, notice, leave, overtime or payment-timing rules? | No law-firm summary reports a change to Arts. 49, 54, 67, 72–81. What it does change: Art. 43 (non-compete up to 2 years, needs Ministry approval, void if employment ends in probation); Art. 115 (Ministry conciliation first); Art. 120 (strikes); Art. 23 bis 1 (licensed professions); 146 bis (sanctions); joint committees (100+ workers); a **new summary-dismissal ground** (unlawfully inciting a disruptive strike → no notice, no gratuity); scope (part-time/freelance excluded). Implementing decisions pending. **Needs the gazette text to confirm nothing else changed.** | ⚠️ |
| L2 | Final-settlement payment deadline | **Art. 67**: wages and all sums due must be paid "before the end of the day following the day on which the contract terminates". If the worker abandoned work without Art. 49 notice: within 7 days. Breach is a criminal offence under Art. 145 (as replaced 2020). Gemini's spec had this right. | ✅ |
| L3 | Does Art. 61 dismissal forfeit gratuity? | **Yes.** Art. 61: "dismiss the worker without notice and without payment of the end of service gratuity". It lists 10 grounds. Law 9/2026 adds strike incitement. Art. 62 adds safeguards (charge within 15 days, written inquiry). My v1 spec was wrong on this; corrected. | ✅ (grounds list ⚠️ pending Law 9/2026 text) |
| L4 | Are unpaid leave days excluded from service? | Art. 54 is silent. Art. 1 says "continuous service" isn't *interrupted* by leave or permitted absence, but doesn't say whether unpaid days *count*. Guides and Ministry practice exclude them. Spec keeps a user field (default 0) with an estimate badge. | ⚠️ |
| L5 | Notice pay in lieu: basic or total wage? | **Basic.** Art. 49 as replaced by Law 18/2020: "compensation in lieu of notice, equivalent to the worker's basic wage for the notice period or the remaining part". (The 2004 text said "wage", which is why many sources say gross.) Both Gemini's spec and my v1 were wrong; corrected. | ✅ |
| L6 | Probation notice | **Art. 39** (replaced 2020): probation ≤ 6 months, one per employer. Employer gives ≥ 1 month notice. Worker moving to a new employer gives 1 month, and the new employer compensates the old one up to 2 months' basic wage. Worker leaving Qatar gives the agreed notice, max 2 months. Compensation in lieu is on basic wage. Leaving Qatar without honouring notice → 1-year work-permit ban. | ✅ |
| L7 | Fixed-term early termination | Since 2020, Art. 49 lets **either party end any contract after probation** with notice. The Labour Law gives no extra compensation formula for the unexpired term. Art. 51 is actually the worker's right to quit without notice and keep gratuity when the employer is at fault; v1 misdescribed it. Open question: can a contract clause or the Civil Code add damages? | ⚠️ |
| L8 | Leave encashment article and wage base | Art. 79: 3 weeks if service is under 5 years, 4 weeks if over 5 years, pro rata for fractions. Art. 81: on termination "for any reason", payment in lieu at the wage for untaken days; the right can't be waived. Art. 72: leave pay and gratuity are on **basic wage** at the date of entitlement. Gemini's Art. 72/79/81 citations were right. Gap: exactly 5 years isn't covered by the wording; spec uses 28 days. | ✅ |
| L9 | Rest-day (Friday) pay | Art. 75: compensated "by another day, and shall be paid for working that day the wage payable to him for the ordinary weekly rest day **or** his basic wage plus an increase of not less than 150%". Two readings: (a) day off + normal pay, or basic × 1.5; (b) basic + 150% = 2.5×. Ministry-cited summaries say 150%. **Needs the Arabic text / a lawyer.** | ⚠️ |
| L10 | Public holiday work | **Art. 78** (not 80): 10 paid days (3 Eid al-Fitr, 3 Eid al-Adha, 1 National Day, 3 employer-chosen). Work on these days → Art. 75 applies, so it's the same open question as L9. | ✅ article / ⚠️ rate |
| L11 | Night overtime and shift workers | Art. 74: OT at basic + ≥ 25%. Work between 9 pm and 6 am at basic + ≥ 50%, **except shift workers**. Max 10 h per day including OT (barring emergencies). Art. 76: Arts. 73–75 don't apply to managers with employer powers. Art. 73 is 48 h/week, 36 h/week in Ramadan; the Embassy translation misprints these as "eighty four" and "per month". | ✅ |
| L12 | Part-time/freelance exclusion wording | Reported by Crowell (Council of Ministers may extend provisions). Article number and exact wording not seen. | ❓ |
| L13 | Dispute route | Law 9/2026 amends **Art. 115**: Ministry amicable settlement first, with timelines, then referral to the Labour Dispute Settlement Committee (Art. 115 bis, chaired by a judge, per Law 18/2020). Limitation periods are suspended during conciliation. | ✅ (from summaries) |
| L14 | Return ticket | Art. 57: employer pays return to the place of recruitment (or as agreed) and completes it within 2 weeks of contract end. | ✅ |
| L15 | Deductions from final dues | Art. 54: employer may deduct sums the worker owes from the gratuity. Art. 70 (monthly wages): loan repayments max 10% of wage, total deductions max 50%, no interest on loans. Art. 71: damage compensation max 7 days' wage per month, after an inquiry. | ✅ |
| L16 | Ministry of Labour's own calculator method | Guides say the Ministry runs an **Arabic-only** online gratuity calculator; it wasn't located or tested. Guides use basic ÷ 30 × 21. Action: find it on mol.gov.qa and run test case A1 through it. | ❓ |
| L17 | Scope (Art. 3) | Excluded: government bodies and **QP/QatarEnergy-established companies**, special-law workers, armed forces/police, seafarers, casual workers, domestic workers, family members, agriculture/grazing. Art. 4: entitlements are minimums; waivers are void. Art. 56: employer retirement schemes. | ✅ |

## Business

| ID | Question | Finding | Status |
|---|---|---|---|
| B1 | Which providers let Qatar residents send money from QAR? | **Western Union**: yes, via the wu.com Qatar site and app, partner Alfardan Exchange; Qatar debit card or cash; online fee advertised around QAR 15–20; limits QAR 34,500 per transfer and QAR 50,000 per week. **WorldRemit**: yes, cards, 130+ destinations. **Wise**: no evidence of a QAR source currency. **Remitly**: no evidence of sending from Qatar. Local exchange houses and bank apps not yet checked. | ⚠️ |
| B2 | Affiliate programme terms (WU, WorldRemit): can you join from your country, are "save QAR X" claims allowed, what disclosure is required? | Not checked. | ❓ |
| B3 | Consent rules for display ads (PDPPL Law 13/2016) if added later | Not checked; the spec launches without ads. | ❓ |
| B4 | Arabic legal terminology reviewed by a native speaker | — | ❓ |

## What changed in SPEC.md because of this pass
- Notice pay → **basic** wage; applies to fixed-term contracts too; probation rules added (A1 total 67,024.66 → **59,024.66**).
- Art. 61 dismissal → gratuity **0**, grounds listed, "I dispute this" toggle; new `art51EmployerBreach` reason (keeps gratuity).
- Art. 67 deadline banner restored with a computed due date.
- Leave citations fixed (72/79/81); holiday article → 78; manager exclusion (Art. 76) added.
- Scope list expanded (Art. 3, 4, 56).
- Partner list: WU and WorldRemit confirmed; Wise and Remitly dropped until confirmed; per-transfer limits added.

## Sources
- Law 14/2004 English text (Qatar Embassy translation): https://dev.alkarama.org/sites/default/files/2016-11/QTR_LabourLaw_EN_0.pdf
- Law 18/2020 English translation (ILO): https://www.ilo.org/wcmsp5/groups/public/---arabstates/---ro-beirut/documents/legaldocument/wcms_754882.pdf
- Crowell — Law 9/2026 alert: https://www.crowell.com/en/insights/client-alerts/qatar-labor-law-key-amendments-introduced-by-law-no-9-of-2026
- Clyde & Co — Law 9/2026: https://www.clydeco.com/en/insights/2026/07/qatar-updates-the-labour-law-what-employers-need
- Conventus Law — Law 9/2026: https://conventuslaw.com/report/qatar-labor-law-key-amendments-introduced-by-law-no-9-of-2026/
- Western Union Qatar FAQ: https://westernunion.com/qa/en/frequently-asked-questions/faq-send-money-online.html
- WorldRemit — send from Qatar: https://www.worldremit.com/en/faq/send-from/asia/qatar
- Wise UAE→Qatar page (QAR not yet supported): https://wise.com/ae/send-money/send-money-to-qatar
