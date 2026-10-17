import { prisma } from "../../../common/prisma";
import { askForJson } from "../../../ai/client";
import { TAX_DISCLAIMER } from "../../../common/disclaimers";

interface AnnualizedInputs {
  annualIncome: number;
  annualInsuranceSpend: number;
  annualInvestmentSpend: number;
  annualRentSpend: number;
  monthsOfData: number;
}

async function computeAnnualizedInputs(userId: string): Promise<AnnualizedInputs> {
  const transactions = await prisma.transaction.findMany({ where: { userId } });
  if (transactions.length === 0) {
    return { annualIncome: 0, annualInsuranceSpend: 0, annualInvestmentSpend: 0, annualRentSpend: 0, monthsOfData: 0 };
  }

  const monthSet = new Set(transactions.map((t) => `${t.date.getUTCFullYear()}-${t.date.getUTCMonth()}`));
  const monthsOfData = Math.max(monthSet.size, 1);
  const annualizeFactor = 12 / monthsOfData;

  let income = 0;
  let insurance = 0;
  let investment = 0;
  let rent = 0;

  for (const t of transactions) {
    if (t.type === "CREDIT") {
      income += t.amount;
    } else if (t.category === "Insurance") {
      insurance += t.amount;
    } else if (t.category === "Investments & Savings") {
      investment += t.amount;
    } else if (t.category === "Rent & Housing") {
      rent += t.amount;
    }
  }

  return {
    annualIncome: Math.round(income * annualizeFactor),
    annualInsuranceSpend: Math.round(insurance * annualizeFactor),
    annualInvestmentSpend: Math.round(investment * annualizeFactor),
    annualRentSpend: Math.round(rent * annualizeFactor),
    monthsOfData,
  };
}

const SCHEMA = {
  name: "report_tax_suggestions",
  description: "Suggest applicable Indian income-tax saving options based on a user's observed spending, only under the old tax regime.",
  inputSchema: {
    type: "object",
    properties: {
      summary: { type: "string" },
      suggestions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            section: { type: "string", description: "e.g. '80C', '80D', 'HRA', '80CCD(1B)'" },
            observation: { type: "string" },
            suggestion: { type: "string" },
            estimatedAnnualLimit: { type: "string", description: "Commonly known limit as text, e.g. '₹1,50,000 (verify current AY limit with your CA)'" },
          },
          required: ["section", "observation", "suggestion", "estimatedAnnualLimit"],
        },
      },
    },
    required: ["summary", "suggestions"],
  },
};

export interface TaxSuggestionsResult {
  summary: string;
  suggestions: Array<{ section: string; observation: string; suggestion: string; estimatedAnnualLimit: string }>;
  disclaimer: string;
  regimeNote: string;
}

const REGIME_NOTE =
  "These deductions (80C, 80D, HRA, 80CCD(1B)) generally apply only under the OLD income-tax regime. If you've opted into the new regime, most of these do not apply — discuss regime choice with your CA.";

export async function analyzeTaxSuggestions(userId: string): Promise<TaxSuggestionsResult> {
  const inputs = await computeAnnualizedInputs(userId);

  if (inputs.monthsOfData === 0) {
    return {
      summary: "Upload at least one statement to get tax-saving suggestions based on your actual spending.",
      suggestions: [],
      disclaimer: TAX_DISCLAIMER,
      regimeNote: REGIME_NOTE,
    };
  }

  const stubResponse = {
    summary: `Based on ~${inputs.monthsOfData} month(s) of data annualized: income ₹${inputs.annualIncome}, insurance spend ₹${inputs.annualInsuranceSpend}, investments ₹${inputs.annualInvestmentSpend}, rent ₹${inputs.annualRentSpend}.`,
    suggestions: [
      {
        section: "80C",
        observation: `Estimated annual investment-linked spend: ₹${inputs.annualInvestmentSpend}.`,
        suggestion:
          inputs.annualInvestmentSpend < 150000
            ? "You may have headroom left under 80C (ELSS, PPF, life insurance premium, EPF, etc.) — consider topping up before the financial year ends."
            : "You appear to already be near or above the typical 80C limit — no further 80C action likely needed.",
        estimatedAnnualLimit: "₹1,50,000 (verify current AY limit with your CA)",
      },
      {
        section: "80D",
        observation: `Estimated annual health/insurance premium spend: ₹${inputs.annualInsuranceSpend}.`,
        suggestion: "Health insurance premiums for self, family, and parents can qualify under 80D — confirm your policy premiums are being claimed.",
        estimatedAnnualLimit: "₹25,000 (self/family) + ₹25,000-₹50,000 (parents) (verify current AY limit with your CA)",
      },
      {
        section: "HRA",
        observation: `Estimated annual rent paid: ₹${inputs.annualRentSpend}.`,
        suggestion:
          inputs.annualRentSpend > 0
            ? "You appear to be paying rent — if you receive HRA from your employer and don't own your residence, you may be able to claim HRA exemption."
            : "No significant rent payments detected in your statements.",
        estimatedAnnualLimit: "Depends on salary structure, city, and rent paid — calculate with your CA",
      },
    ],
    disclaimer: TAX_DISCLAIMER,
    regimeNote: REGIME_NOTE,
  };

  const result = await askForJson<{ summary: string; suggestions: TaxSuggestionsResult["suggestions"] }>({
    system:
      "You are a cautious Indian personal-tax guidance assistant. You ONLY discuss well-established, commonly known deductions (80C, 80D, HRA, 80CCD(1B)) applicable under the OLD tax regime, based on the user's observed annualized spending. Always caveat that exact limits should be verified for the current assessment year with a Chartered Accountant. Never claim certainty about eligibility.",
    prompt: `Annualized financial snapshot for this user (INR):\n${JSON.stringify(inputs, null, 2)}\n\nSuggest applicable tax-saving sections with observations grounded in these numbers.`,
    tool: SCHEMA,
    stubResponse,
  });

  return { ...result, disclaimer: TAX_DISCLAIMER, regimeNote: REGIME_NOTE };
}
