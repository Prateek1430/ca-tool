import { MonthlyBucket } from "./stats";

export interface ForecastPoint {
  month: string; // YYYY-MM, future
  projectedIncome: number;
  projectedExpense: number;
  projectedSavings: number;
}

/** Ordinary least-squares slope/intercept over evenly spaced x = 0..n-1. */
function linearRegression(values: number[]): { slope: number; intercept: number } {
  const n = values.length;
  if (n === 0) return { slope: 0, intercept: 0 };
  if (n === 1) return { slope: 0, intercept: values[0] };

  const xMean = (n - 1) / 2;
  const yMean = values.reduce((s, v) => s + v, 0) / n;

  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (values[i] - yMean);
    den += (i - xMean) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = yMean - slope * xMean;
  return { slope, intercept };
}

function nextMonthKey(monthKey: string, offset: number): string {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + offset, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Simple trend-based cash-flow forecast (linear regression over recent months,
 * clamped at 0). Deterministic and dependency-free by design — this is meant
 * to be a "shuru karo simple, improve later" baseline, not a full time-series
 * model.
 */
export function forecastNextMonths(months: MonthlyBucket[], horizon = 3): ForecastPoint[] {
  if (months.length === 0) {
    return Array.from({ length: horizon }, (_, i) => ({
      month: nextMonthKey(new Date().toISOString().slice(0, 7), i + 1),
      projectedIncome: 0,
      projectedExpense: 0,
      projectedSavings: 0,
    }));
  }

  // Use at most the last 6 months so old spending patterns don't dominate the trend.
  const recent = months.slice(-6);
  const incomeReg = linearRegression(recent.map((m) => m.income));
  const expenseReg = linearRegression(recent.map((m) => m.expense));

  const lastMonth = months[months.length - 1].month;
  const baseIndex = recent.length - 1;

  return Array.from({ length: horizon }, (_, i) => {
    const x = baseIndex + i + 1;
    const projectedIncome = Math.max(0, incomeReg.slope * x + incomeReg.intercept);
    const projectedExpense = Math.max(0, expenseReg.slope * x + expenseReg.intercept);
    return {
      month: nextMonthKey(lastMonth, i + 1),
      projectedIncome: Math.round(projectedIncome),
      projectedExpense: Math.round(projectedExpense),
      projectedSavings: Math.round(projectedIncome - projectedExpense),
    };
  });
}
