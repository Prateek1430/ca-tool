import { prisma } from "../../../common/prisma";
import { askForJson } from "../../../ai/client";
import { FINANCE_DISCLAIMER } from "../../../common/disclaimers";

const FREQUENCY_DAYS: Record<string, number> = { weekly: 7, monthly: 30 };
const UNUSED_MULTIPLIER = 2; // no charge for 2x the expected cycle -> likely cancelled/unused

/**
 * Deterministically flags a subscription LIKELY_UNUSED if it hasn't recurred
 * within ~2x its expected cycle (e.g. a "monthly" charge silent for 60+ days).
 * Kept separate from the AI call so the actual status is never hallucinated.
 */
export async function recomputeSubscriptionStatuses(userId: string) {
  const subs = await prisma.subscription.findMany({ where: { userId } });
  const now = Date.now();

  for (const sub of subs) {
    const cycleDays = FREQUENCY_DAYS[sub.frequency] ?? 30;
    const daysSinceLastSeen = (now - sub.lastSeen.getTime()) / (1000 * 60 * 60 * 24);
    const status = daysSinceLastSeen > cycleDays * UNUSED_MULTIPLIER ? "LIKELY_UNUSED" : "ACTIVE";
    if (status !== sub.status) {
      await prisma.subscription.update({ where: { id: sub.id }, data: { status } });
    }
  }

  return prisma.subscription.findMany({ where: { userId }, orderBy: { lastSeen: "desc" } });
}

const SCHEMA = {
  name: "report_subscription_insight",
  description: "Summarize a user's detected recurring subscriptions and flag ones worth cancelling.",
  inputSchema: {
    type: "object",
    properties: {
      summary: { type: "string" },
      totalMonthlyCost: { type: "number", description: "Sum of all ACTIVE subscriptions normalized to a monthly cost, INR." },
      recommendations: {
        type: "array",
        items: {
          type: "object",
          properties: {
            merchant: { type: "string" },
            advice: { type: "string" },
          },
          required: ["merchant", "advice"],
        },
      },
    },
    required: ["summary", "totalMonthlyCost", "recommendations"],
  },
};

export interface SubscriptionInsightResult {
  subscriptions: Awaited<ReturnType<typeof recomputeSubscriptionStatuses>>;
  summary: string;
  totalMonthlyCost: number;
  recommendations: Array<{ merchant: string; advice: string }>;
  disclaimer: string;
}

export async function analyzeSubscriptions(userId: string): Promise<SubscriptionInsightResult> {
  const subscriptions = await recomputeSubscriptionStatuses(userId);

  if (subscriptions.length === 0) {
    return {
      subscriptions,
      summary: "No recurring subscriptions were detected yet. Upload more statement history to improve detection.",
      totalMonthlyCost: 0,
      recommendations: [],
      disclaimer: FINANCE_DISCLAIMER,
    };
  }

  const monthlyNormalized = (amount: number, frequency: string) =>
    frequency === "weekly" ? amount * 4.33 : amount;

  const stubResponse = {
    summary: `${subscriptions.length} recurring payment(s) detected, ${subscriptions.filter((s) => s.status === "LIKELY_UNUSED").length} look inactive.`,
    totalMonthlyCost: Math.round(
      subscriptions.filter((s) => s.status === "ACTIVE").reduce((sum, s) => sum + monthlyNormalized(s.amount, s.frequency), 0)
    ),
    recommendations: subscriptions
      .filter((s) => s.status === "LIKELY_UNUSED")
      .map((s) => ({
        merchant: s.merchant,
        advice: `No charge seen since ${s.lastSeen.toISOString().slice(0, 10)} — check if this is still needed, it may already be lapsed or worth cancelling.`,
      })),
  };

  const result = await askForJson<typeof stubResponse>({
    system:
      "You are a personal finance assistant for Indian users reviewing recurring subscription charges detected from bank/UPI statements. Recommend which look like genuinely unused subscriptions worth cancelling.",
    prompt: `Detected subscriptions (merchant, monthly-equivalent amount in INR, frequency, last seen date, status):\n${JSON.stringify(
      subscriptions.map((s) => ({
        merchant: s.merchant,
        amount: monthlyNormalized(s.amount, s.frequency),
        frequency: s.frequency,
        lastSeen: s.lastSeen.toISOString().slice(0, 10),
        status: s.status,
      })),
      null,
      2
    )}`,
    tool: SCHEMA,
    stubResponse,
  });

  return { subscriptions, ...result, disclaimer: FINANCE_DISCLAIMER };
}
