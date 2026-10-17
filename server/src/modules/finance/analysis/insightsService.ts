import { InsightType } from "@prisma/client";
import { prisma } from "../../../common/prisma";
import { analyzeMoneyLeaks } from "./moneyLeaks";
import { analyzeSubscriptions } from "./subscriptions";
import { analyzeTaxSuggestions } from "./taxSuggestions";
import { analyzeBudgetRecommendation } from "./budgetRecommendation";
import { analyzeForecast } from "./forecastInsight";

const COMPUTERS: Record<InsightType, (userId: string) => Promise<unknown>> = {
  MONEY_LEAK: analyzeMoneyLeaks,
  SUBSCRIPTIONS: analyzeSubscriptions,
  TAX: analyzeTaxSuggestions,
  BUDGET: analyzeBudgetRecommendation,
  FORECAST: analyzeForecast,
};

/**
 * Insights are cached per user+type until the next statement upload clears
 * them (see finance/service.ts uploadStatement), so re-viewing the dashboard
 * doesn't re-call the AI on every request.
 */
async function getOrCompute<T>(userId: string, type: InsightType): Promise<T> {
  const cached = await prisma.financeInsight.findUnique({ where: { userId_type: { userId, type } } });
  if (cached) {
    return cached.content as T;
  }

  const computed = await COMPUTERS[type](userId);
  const serializable = JSON.parse(JSON.stringify(computed));

  await prisma.financeInsight.upsert({
    where: { userId_type: { userId, type } },
    update: { content: serializable },
    create: { userId, type, content: serializable },
  });

  return serializable as T;
}

export async function getMoneyLeaks(userId: string) {
  return getOrCompute<Awaited<ReturnType<typeof analyzeMoneyLeaks>>>(userId, "MONEY_LEAK");
}

export async function getSubscriptionInsight(userId: string) {
  return getOrCompute<Awaited<ReturnType<typeof analyzeSubscriptions>>>(userId, "SUBSCRIPTIONS");
}

export async function getTaxSuggestions(userId: string) {
  return getOrCompute<Awaited<ReturnType<typeof analyzeTaxSuggestions>>>(userId, "TAX");
}

export async function getBudgetRecommendation(userId: string) {
  return getOrCompute<Awaited<ReturnType<typeof analyzeBudgetRecommendation>>>(userId, "BUDGET");
}

export async function getForecast(userId: string) {
  return getOrCompute<Awaited<ReturnType<typeof analyzeForecast>>>(userId, "FORECAST");
}

export async function getAllInsights(userId: string) {
  const [moneyLeaks, subscriptions, tax, budget, forecast] = await Promise.all([
    getMoneyLeaks(userId),
    getSubscriptionInsight(userId),
    getTaxSuggestions(userId),
    getBudgetRecommendation(userId),
    getForecast(userId),
  ]);
  return { moneyLeaks, subscriptions, tax, budget, forecast };
}
