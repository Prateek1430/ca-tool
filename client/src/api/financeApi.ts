import { baseApi } from "./baseApi";

export interface Statement {
  id: string;
  filename: string;
  sourceType: "CSV" | "PDF";
  bankFormat: string;
  uploadedAt: string;
  _count: { transactions: number };
}

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  description: string;
  category: string;
  type: "DEBIT" | "CREDIT";
  merchant: string;
  isRecurring: boolean;
}

export interface Subscription {
  id: string;
  merchant: string;
  amount: number;
  frequency: string;
  lastSeen: string;
  status: "ACTIVE" | "LIKELY_UNUSED";
}

export interface SpendingSummary {
  totalIncome: number;
  totalExpense: number;
  savingsRate: number;
  spendingByCategory: Array<{ category: string; amount: number }>;
  monthlyTrend: Array<{ month: string; income: number; expense: number }>;
  transactionCount: number;
}

export interface MoneyLeaksResult {
  summary: string;
  totalMonthlyLeakEstimate: number;
  leaks: Array<{ merchant: string; category: string; monthlyImpact: number; explanation: string; recommendation: string }>;
  disclaimer: string;
}

export interface SubscriptionInsightResult {
  subscriptions: Subscription[];
  summary: string;
  totalMonthlyCost: number;
  recommendations: Array<{ merchant: string; advice: string }>;
  disclaimer: string;
}

export interface TaxSuggestionsResult {
  summary: string;
  suggestions: Array<{ section: string; observation: string; suggestion: string; estimatedAnnualLimit: string }>;
  disclaimer: string;
  regimeNote: string;
}

export interface BudgetRecommendationResult {
  summary: string;
  budgets: Array<{ category: string; recommendedMonthlyBudget: number; reasoning: string }>;
  disclaimer: string;
}

export interface ForecastResult {
  monthsOfHistory: number;
  forecast: Array<{ month: string; projectedIncome: number; projectedExpense: number; projectedSavings: number }>;
  commentary: string;
  disclaimer: string;
}

export interface AllInsights {
  moneyLeaks: MoneyLeaksResult;
  subscriptions: SubscriptionInsightResult;
  tax: TaxSuggestionsResult;
  budget: BudgetRecommendationResult;
  forecast: ForecastResult;
}

export interface UploadStatementResult {
  statementId: string;
  bankFormat: string;
  sourceType: "CSV" | "PDF";
  transactionsImported: number;
  duplicatesSkipped: number;
  recurringMerchantsDetected: number;
  warnings: string[];
}

export const financeApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    uploadStatement: builder.mutation<UploadStatementResult, FormData>({
      query: (body) => ({ url: "/finance/upload", method: "POST", body }),
      invalidatesTags: ["Statements", "Transactions", "Subscriptions", "Insights"],
    }),
    listStatements: builder.query<Statement[], void>({
      query: () => "/finance/statements",
      providesTags: ["Statements"],
    }),
    listTransactions: builder.query<Transaction[], void>({
      query: () => "/finance/transactions",
      providesTags: ["Transactions"],
    }),
    listSubscriptions: builder.query<Subscription[], void>({
      query: () => "/finance/subscriptions",
      providesTags: ["Subscriptions"],
    }),
    getSummary: builder.query<SpendingSummary, void>({
      query: () => "/finance/summary",
      providesTags: ["Transactions"],
    }),
    getAllInsights: builder.query<AllInsights, void>({
      query: () => "/finance/insights",
      providesTags: ["Insights"],
    }),
  }),
});

export const {
  useUploadStatementMutation,
  useListStatementsQuery,
  useListTransactionsQuery,
  useListSubscriptionsQuery,
  useGetSummaryQuery,
  useGetAllInsightsQuery,
} = financeApi;
