interface TxnForDetection {
  merchant: string;
  amount: number;
  date: Date;
  type: "DEBIT" | "CREDIT";
}

export interface DetectedRecurrence {
  merchant: string;
  amount: number;
  frequency: "weekly" | "monthly";
  lastSeen: Date;
  occurrences: number;
}

const MONTHLY_GAP_DAYS = { min: 24, max: 37 };
const WEEKLY_GAP_DAYS = { min: 5, max: 9 };
const AMOUNT_TOLERANCE = 0.1; // 10%

function daysBetween(a: Date, b: Date): number {
  return Math.abs(a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24);
}

function withinTolerance(a: number, b: number): boolean {
  if (a === 0 && b === 0) return true;
  return Math.abs(a - b) / Math.max(a, b) <= AMOUNT_TOLERANCE;
}

function gapsMatch(gaps: number[], range: { min: number; max: number }): boolean {
  return gaps.every((g) => g >= range.min && g <= range.max);
}

/**
 * Recurring-payment detection: groups debits by merchant, then checks whether
 * consecutive occurrences fall at consistent weekly/monthly intervals with a
 * roughly stable amount. This is a heuristic (used to seed the AI subscription
 * narrative and to flag `isRecurring` on transactions), not a guarantee.
 */
export function detectRecurring(transactions: TxnForDetection[]): DetectedRecurrence[] {
  const debits = transactions.filter((t) => t.type === "DEBIT");
  const byMerchant = new Map<string, TxnForDetection[]>();

  for (const txn of debits) {
    const key = txn.merchant.toLowerCase().trim() || "unknown";
    if (!byMerchant.has(key)) byMerchant.set(key, []);
    byMerchant.get(key)!.push(txn);
  }

  const results: DetectedRecurrence[] = [];

  for (const [merchant, txns] of byMerchant) {
    if (txns.length < 2) continue;
    const sorted = [...txns].sort((a, b) => a.date.getTime() - b.date.getTime());

    const gaps: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      gaps.push(daysBetween(sorted[i - 1].date, sorted[i].date));
    }

    const amountsMatch = sorted.every((t) => withinTolerance(t.amount, sorted[0].amount));
    if (!amountsMatch) continue;

    let frequency: "weekly" | "monthly" | null = null;
    if (gapsMatch(gaps, MONTHLY_GAP_DAYS)) frequency = "monthly";
    else if (gapsMatch(gaps, WEEKLY_GAP_DAYS)) frequency = "weekly";

    if (!frequency) continue;

    const avgAmount = sorted.reduce((s, t) => s + t.amount, 0) / sorted.length;
    results.push({
      merchant,
      amount: Math.round(avgAmount * 100) / 100,
      frequency,
      lastSeen: sorted[sorted.length - 1].date,
      occurrences: sorted.length,
    });
  }

  return results;
}
