import { prisma } from "../../../common/prisma";
import { askForJson } from "../../../ai/client";
import { FINANCE_DISCLAIMER } from "../../../common/disclaimers";

const ESSENTIAL_CATEGORIES = new Set([
  "Rent & Housing",
  "Utilities & Bills",
  "Groceries",
  "Healthcare",
  "Insurance",
  "Loan & EMI",
  "Education",
  "Transfers & Withdrawals",
  "Uncategorized",
]);

const TRIM_RATIO = 0.9; // suggest discretionary categories trim to 90% of recent average

interface CategoryAverage {
  category: string;
  avgMonthlySpend: number;
  isDiscretionary: boolean;
}

async function computeCategoryAverages(userId: string): Promise<{ months: number; categories: CategoryAverage[] }> {
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setUTCMonth(threeMonthsAgo.getUTCMonth() - 3);

  const transactions = await prisma.transaction.findMany({
    where: { userId, type: "DEBIT", date: { gte: threeMonthsAgo } },
  });

  const monthSet = new Set(transactions.map((t) => `${t.date.getUTCFullYear()}-${t.date.getUTCMonth()}`));
  const months = Math.max(monthSet.size, 1);

  const totals = new Map<string, number>();
  for (const t of transactions) {
    totals.set(t.category, (totals.get(t.category) ?? 0) + t.amount);
  }

  const categories = Array.from(totals.entries()).map(([category, total]) => ({
    category,
    avgMonthlySpend: Math.round(total / months),
    isDiscretionary: !ESSENTIAL_CATEGORIES.has(category),
  }));

  return { months, categories };
}

const SCHEMA = {
  name: "report_budget_recommendation",
  description: "Recommend a monthly budget per spending category based on recent averages.",
  inputSchema: {
    type: "object",
    properties: {
      summary: { type: "string" },
      budgets: {
        type: "array",
        items: {
          type: "object",
          properties: {
            category: { type: "string" },
            recommendedMonthlyBudget: { type: "number" },
            reasoning: { type: "string" },
          },
          required: ["category", "recommendedMonthlyBudget", "reasoning"],
        },
      },
    },
    required: ["summary", "budgets"],
  },
};

export interface BudgetRecommendationResult {
  summary: string;
  budgets: Array<{ category: string; recommendedMonthlyBudget: number; reasoning: string }>;
  disclaimer: string;
}

export async function analyzeBudgetRecommendation(userId: string): Promise<BudgetRecommendationResult> {
  const { months, categories } = await computeCategoryAverages(userId);

  if (categories.length === 0) {
    return {
      summary: "Upload at least one statement to get a category-wise budget recommendation.",
      budgets: [],
      disclaimer: FINANCE_DISCLAIMER,
    };
  }

  const stubResponse = {
    summary: `Recommendation based on the last ${months} month(s) of spending. Discretionary categories are trimmed ~10%; essential categories keep their recent average.`,
    budgets: categories.map((c) => ({
      category: c.category,
      recommendedMonthlyBudget: c.isDiscretionary ? Math.round(c.avgMonthlySpend * TRIM_RATIO) : c.avgMonthlySpend,
      reasoning: c.isDiscretionary
        ? `Discretionary category averaging ₹${c.avgMonthlySpend}/month — suggesting a modest 10% trim to build savings.`
        : `Essential category averaging ₹${c.avgMonthlySpend}/month — kept at the recent average since it's largely non-discretionary.`,
    })),
  };

  const result = await askForJson<typeof stubResponse>({
    system:
      "You are a personal budgeting assistant for Indian users. Given recent average monthly spend per category, recommend a realistic monthly budget per category. Keep essential categories close to their average; suggest modest, realistic trims (5-15%) for discretionary categories. Do not suggest unrealistic cuts.",
    prompt: `Average monthly spend per category over the last ${months} month(s) (INR), with a flag for whether it's discretionary:\n${JSON.stringify(categories, null, 2)}`,
    tool: SCHEMA,
    stubResponse,
  });

  return { ...result, disclaimer: FINANCE_DISCLAIMER };
}
