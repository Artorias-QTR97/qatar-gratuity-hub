import { round2 } from './money';

export interface TransferCost {
  /** What the recipient gets at the mid-market rate. */
  midMarketReceive: number;
  /** What the recipient gets at the quoted rate, after the fee is taken from the amount sent. */
  quotedReceive: number;
  /** Total cost versus mid-market, expressed in QAR. */
  costQAR: number;
  costPercent: number;
}

/**
 * Compares a quoted rate + fee with the mid-market rate.
 * Rates are "units of target currency per 1 QAR".
 */
export function transferCost(amountQAR: number, midRate: number, quotedRate: number, feeQAR: number): TransferCost | null {
  if (![amountQAR, midRate, quotedRate, feeQAR].every(Number.isFinite)) return null;
  if (amountQAR <= 0 || midRate <= 0 || quotedRate <= 0 || feeQAR < 0 || feeQAR >= amountQAR) return null;
  const midMarketReceive = amountQAR * midRate;
  const quotedReceive = (amountQAR - feeQAR) * quotedRate;
  const costQAR = (midMarketReceive - quotedReceive) / midRate;
  return {
    midMarketReceive: round2(midMarketReceive),
    quotedReceive: round2(quotedReceive),
    costQAR: round2(costQAR),
    costPercent: round2((costQAR / amountQAR) * 100),
  };
}

export function transfersNeeded(amountQAR: number, maxPerTransferQAR: number | undefined): number {
  if (!maxPerTransferQAR || amountQAR <= 0) return 1;
  return Math.ceil(amountQAR / maxPerTransferQAR);
}
