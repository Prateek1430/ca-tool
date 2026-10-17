import { askForJson } from "../../../ai/client";
import { FINANCE_DISCLAIMER } from "../../../common/disclaimers";
import { buildFinanceStats } from "./stats";
import { forecastNextMonths, ForecastPoint } from "./forecast";

const SCHEMA = {
  name: "report_forecast_commentary",
  description: "Give a short plain-English commentary on a computed cash-flow forecast.",
  inputSchema: {
    type: "object",
    properties: {
      commentary: { type: "string", description: "2-4 sentence plain-English summary of the trend and any advice." },
    },
    required: ["commentary"],
  },
};

export interface ForecastResult {
  monthsOfHistory: number;
  forecast: ForecastPoint[];
  commentary: string;
  disclaimer: string;
}

export async function analyzeForecast(userId: string): Promise<ForecastResult> {
  const stats = await buildFinanceStats(userId);

  if (stats.months.length === 0) {
    return {
      monthsOfHistory: 0,
      forecast: [],
      commentary: "Upload at least one statement to generate a cash-flow forecast.",
      disclaimer: FINANCE_DISCLAIMER,
    };
  }

  const forecast = forecastNextMonths(stats.months, 3);

  const stubCommentary =
    stats.months.length < 2
      ? "Only one month of history is available, so this forecast simply repeats your current spending — upload more statements for a more accurate trend."
      : forecast[forecast.length - 1].projectedSavings >= 0
        ? "Based on your recent trend, your expenses look manageable relative to income over the next few months. Keep monitoring discretionary categories to maintain this."
        : "Based on your recent trend, projected expenses may outpace income in the coming months — consider reviewing discretionary spending soon.";

  const { commentary } = await askForJson<{ commentary: string }>({
    system: "You are a personal finance assistant. Given a simple trend-based cash-flow forecast, write a short, plain-English, non-alarming commentary.",
    prompt: `Historical monthly income/expense (INR): ${JSON.stringify(
      stats.months.map((m) => ({ month: m.month, income: m.income, expense: m.expense }))
    )}\n\nForecast for next months: ${JSON.stringify(forecast)}`,
    tool: SCHEMA,
    stubResponse: { commentary: stubCommentary },
  });

  return { monthsOfHistory: stats.months.length, forecast, commentary, disclaimer: FINANCE_DISCLAIMER };
}
