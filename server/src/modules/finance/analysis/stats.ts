import { prisma } from "../../../common/prisma";

export interface MonthlyBucket {
  month: string; // YYYY-MM
  income: number;
  expense: number;
  byCategory: Record<string, number>;
}

export interface FinanceStats {
  months: MonthlyBucket[]; // chronological
  categoryTotals: Record<string, number>; // full-history expense totals
  avgMonthlyIncome: number;
  avgMonthlyExpense: number;
  monthsWithData: number;
}

function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function buildFinanceStats(userId: string): Promise<FinanceStats> {
  const transactions = await prisma.transaction.findMany({ where: { userId } });

  const monthMap = new Map<string, MonthlyBucket>();
  const categoryTotals: Record<string, number> = {};

  for (const t of transactions) {
    const key = monthKey(t.date);
    if (!monthMap.has(key)) {
      monthMap.set(key, { month: key, income: 0, expense: 0, byCategory: {} });
    }
    const bucket = monthMap.get(key)!;

    if (t.type === "CREDIT") {
      bucket.income += t.amount;
    } else {
      bucket.expense += t.amount;
      bucket.byCategory[t.category] = (bucket.byCategory[t.category] ?? 0) + t.amount;
      categoryTotals[t.category] = (categoryTotals[t.category] ?? 0) + t.amount;
    }
  }

  const months = Array.from(monthMap.values()).sort((a, b) => (a.month < b.month ? -1 : 1));
  const monthsWithData = months.length || 1;
  const avgMonthlyIncome = months.reduce((s, m) => s + m.income, 0) / monthsWithData;
  const avgMonthlyExpense = months.reduce((s, m) => s + m.expense, 0) / monthsWithData;

  return { months, categoryTotals, avgMonthlyIncome, avgMonthlyExpense, monthsWithData };
}
