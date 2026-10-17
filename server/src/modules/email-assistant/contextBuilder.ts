import { getSpendingSummary, listSubscriptions } from "../finance/service";
import { getAllInsights } from "../finance/analysis/insightsService";
import { listContracts } from "../contracts/service";

export interface ClientContext {
  finance: {
    totalIncome: number;
    totalExpense: number;
    savingsRate: number;
    topCategories: Array<{ category: string; amount: number }>;
  };
  subscriptions: Array<{ merchant: string; amount: number; status: string }>;
  insightHighlights: {
    moneyLeakSummary: string;
    taxSummary: string;
    budgetSummary: string;
  };
  contracts: Array<{ filename: string; riskRating: string | null; renewalDate: string | null }>;
}

/** Builds a compact snapshot of a client's data to ground the AI's email draft — never the full transaction/contract text. */
export async function buildClientContext(clientId: string): Promise<ClientContext> {
  const [summary, subscriptions, insights, contracts] = await Promise.all([
    getSpendingSummary(clientId),
    listSubscriptions(clientId),
    getAllInsights(clientId),
    listContracts(clientId),
  ]);

  return {
    finance: {
      totalIncome: summary.totalIncome,
      totalExpense: summary.totalExpense,
      savingsRate: Math.round(summary.savingsRate * 100) / 100,
      topCategories: summary.spendingByCategory.sort((a, b) => b.amount - a.amount).slice(0, 5),
    },
    subscriptions: subscriptions.map((s) => ({ merchant: s.merchant, amount: s.amount, status: s.status })),
    insightHighlights: {
      moneyLeakSummary: insights.moneyLeaks.summary,
      taxSummary: insights.tax.summary,
      budgetSummary: insights.budget.summary,
    },
    contracts: contracts.map((c) => ({
      filename: c.filename,
      riskRating: c.riskRating,
      renewalDate: c.renewalDate ? c.renewalDate.toISOString().slice(0, 10) : null,
    })),
  };
}
