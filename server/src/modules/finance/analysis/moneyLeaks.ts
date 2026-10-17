import { prisma } from "../../../common/prisma";
import { askForJson } from "../../../ai/client";
import { FINANCE_DISCLAIMER } from "../../../common/disclaimers";

interface LeakCandidate {
  merchant: string;
  category: string;
  occurrences: number;
  avgAmount: number;
  totalAmount: number;
}

const SMALL_TXN_THRESHOLD = 500; // below this is "small" spend worth scrutinizing
const MIN_OCCURRENCES = 3;

async function computeCandidates(userId: string): Promise<LeakCandidate[]> {
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setUTCMonth(threeMonthsAgo.getUTCMonth() - 3);

  const transactions = await prisma.transaction.findMany({
    where: { userId, type: "DEBIT", date: { gte: threeMonthsAgo } },
  });

  const groups = new Map<string, { category: string; amounts: number[] }>();
  for (const t of transactions) {
    const key = t.merchant.toLowerCase().trim() || "unknown";
    if (!groups.has(key)) groups.set(key, { category: t.category, amounts: [] });
    groups.get(key)!.amounts.push(t.amount);
  }

  const candidates: LeakCandidate[] = [];
  for (const [merchant, g] of groups) {
    const avgAmount = g.amounts.reduce((s, a) => s + a, 0) / g.amounts.length;
    if (g.amounts.length >= MIN_OCCURRENCES && avgAmount <= SMALL_TXN_THRESHOLD) {
      candidates.push({
        merchant,
        category: g.category,
        occurrences: g.amounts.length,
        avgAmount: Math.round(avgAmount),
        totalAmount: Math.round(g.amounts.reduce((s, a) => s + a, 0)),
      });
    }
  }

  return candidates.sort((a, b) => b.totalAmount - a.totalAmount).slice(0, 15);
}

const SCHEMA = {
  name: "report_money_leaks",
  description: "Report identified money leaks (small recurring wasteful expenses) for a user.",
  inputSchema: {
    type: "object",
    properties: {
      summary: { type: "string", description: "1-2 sentence overview of spending leak patterns found." },
      totalMonthlyLeakEstimate: { type: "number", description: "Estimated total wasted spend per month, in INR." },
      leaks: {
        type: "array",
        items: {
          type: "object",
          properties: {
            merchant: { type: "string" },
            category: { type: "string" },
            monthlyImpact: { type: "number", description: "Estimated INR/month attributable to this leak." },
            explanation: { type: "string" },
            recommendation: { type: "string" },
          },
          required: ["merchant", "category", "monthlyImpact", "explanation", "recommendation"],
        },
      },
    },
    required: ["summary", "totalMonthlyLeakEstimate", "leaks"],
  },
};

export interface MoneyLeaksResult {
  summary: string;
  totalMonthlyLeakEstimate: number;
  leaks: Array<{
    merchant: string;
    category: string;
    monthlyImpact: number;
    explanation: string;
    recommendation: string;
  }>;
  disclaimer: string;
}

export async function analyzeMoneyLeaks(userId: string): Promise<MoneyLeaksResult> {
  const candidates = await computeCandidates(userId);

  if (candidates.length === 0) {
    return {
      summary: "No recurring small-spend patterns were found in the last 3 months of transactions.",
      totalMonthlyLeakEstimate: 0,
      leaks: [],
      disclaimer: FINANCE_DISCLAIMER,
    };
  }

  const stubResponse = {
    summary: `Found ${candidates.length} recurring small-spend pattern(s) that add up over time.`,
    totalMonthlyLeakEstimate: Math.round(candidates.reduce((s, c) => s + c.totalAmount, 0) / 3),
    leaks: candidates.slice(0, 8).map((c) => ({
      merchant: c.merchant,
      category: c.category,
      monthlyImpact: Math.round(c.totalAmount / 3),
      explanation: `${c.occurrences} transactions averaging ~₹${c.avgAmount} over the last 3 months.`,
      recommendation: `Review whether all ${c.occurrences} recent "${c.merchant}" charges were necessary; consider setting a monthly cap for this category.`,
    })),
  };

  const result = await askForJson<typeof stubResponse>({
    system:
      "You are a careful personal finance analyst for Indian users. Given recurring small-transaction data from a bank/UPI statement, identify genuine 'money leaks' — small wasteful or forgettable recurring expenses. Be specific and practical. Do not invent transactions beyond what is given.",
    prompt: `Here are candidate recurring small transactions from the last 3 months (merchant, category, occurrences, average amount in INR, total amount in INR):\n${JSON.stringify(candidates, null, 2)}\n\nIdentify the real money leaks and quantify monthly impact.`,
    tool: SCHEMA,
    stubResponse,
  });

  return { ...result, disclaimer: FINANCE_DISCLAIMER };
}
