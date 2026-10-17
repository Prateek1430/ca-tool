import { askForJson } from "../../ai/client";
import { CONTRACT_DISCLAIMER } from "../../common/disclaimers";
import { findMissingStandardClauses } from "./standardClauses";
import { detectRedFlagClauses } from "./redFlags";
import { extractRenewalHeuristic } from "./renewalDateExtractor";

export type RiskRating = "LOW" | "MEDIUM" | "HIGH";

export interface ContractAnalysisResult {
  riskClauses: Array<{ clauseText: string; explanation: string; severity: RiskRating }>;
  missingClauses: Array<{ clauseName: string; explanation: string }>;
  plainEnglishSummary: string;
  overallRiskRating: RiskRating;
  conclusion: string;
  renewalDate: string | null; // ISO date
  renewalInfo: string;
  disclaimer: string;
  aiGenerated: boolean;
}

const SCHEMA = {
  name: "report_contract_analysis",
  description: "Report a structured risk analysis of a legal contract/agreement.",
  inputSchema: {
    type: "object",
    properties: {
      riskClauses: {
        type: "array",
        items: {
          type: "object",
          properties: {
            clauseText: { type: "string", description: "The relevant clause or sentence, quoted or closely paraphrased." },
            explanation: { type: "string", description: "Why this clause could work against the user." },
            severity: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] },
          },
          required: ["clauseText", "explanation", "severity"],
        },
      },
      missingClauses: {
        type: "array",
        items: {
          type: "object",
          properties: {
            clauseName: { type: "string" },
            explanation: { type: "string" },
          },
          required: ["clauseName", "explanation"],
        },
      },
      plainEnglishSummary: { type: "string", description: "3-6 sentence plain-English summary of what this contract requires of each party." },
      overallRiskRating: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] },
      conclusion: { type: "string", description: "Overall recommendation for the user." },
      renewalDate: { type: ["string", "null"], description: "ISO date (YYYY-MM-DD) of renewal/expiry if mentioned, else null." },
      renewalInfo: { type: "string", description: "Plain description of renewal/auto-renewal terms, or 'No renewal terms found.'" },
    },
    required: ["riskClauses", "missingClauses", "plainEnglishSummary", "overallRiskRating", "conclusion", "renewalDate", "renewalInfo"],
  },
};

function heuristicRiskRating(missingCount: number, redFlagCount: number, highSeverityCount: number): RiskRating {
  if (highSeverityCount > 0 || missingCount >= 5) return "HIGH";
  if (redFlagCount > 0 || missingCount >= 2) return "MEDIUM";
  return "LOW";
}

export async function analyzeContract(text: string): Promise<ContractAnalysisResult> {
  const missingHeuristic = findMissingStandardClauses(text);
  const redFlagsHeuristic = detectRedFlagClauses(text);
  const renewalHeuristic = extractRenewalHeuristic(text);
  const highSeverityCount = redFlagsHeuristic.filter((f) => f.severity === "HIGH").length;

  const stubResponse: Omit<ContractAnalysisResult, "disclaimer" | "aiGenerated"> = {
    riskClauses: redFlagsHeuristic,
    missingClauses: missingHeuristic.map((c) => ({ clauseName: c.name, explanation: c.whyItMatters })),
    plainEnglishSummary:
      "AI-generated plain-English summary is unavailable because no AI key is configured. The findings below are from an automated keyword/structure scan only — please read the full document or configure ANTHROPIC_API_KEY for a proper summary.",
    overallRiskRating: heuristicRiskRating(missingHeuristic.length, redFlagsHeuristic.length, highSeverityCount),
    conclusion:
      "This is a structural scan, not a substantive legal review. Please have a qualified lawyer review this contract before signing.",
    renewalDate: renewalHeuristic.renewalDate ? renewalHeuristic.renewalDate.toISOString().slice(0, 10) : null,
    renewalInfo: renewalHeuristic.matchedSentence
      ? `${renewalHeuristic.autoRenewal ? "Appears to auto-renew. " : ""}Found near: "${renewalHeuristic.matchedSentence}"`
      : "No renewal/expiry terms were detected by the automated scan.",
  };

  const aiResult = await askForJson<typeof stubResponse>({
    system:
      "You are a cautious contract-review assistant. Analyze the given contract text and identify risk clauses (that could work against the user signing it), missing standard clauses, a plain-English summary, an overall risk rating, a conclusion/recommendation, and renewal/expiry date information if present. Be specific and quote or closely paraphrase actual clauses. Do not invent clauses not present in the text. If the document is not in English, still analyze it but note the language in your summary.",
    prompt: `Contract text:\n\n${text}\n\nAlso consider these automated structural findings for cross-reference (you may agree, disagree, or refine them):\nMissing standard clauses detected: ${JSON.stringify(missingHeuristic.map((c) => c.name))}\nKeyword-based red flags detected: ${JSON.stringify(redFlagsHeuristic)}\nRenewal heuristic: ${JSON.stringify(renewalHeuristic)}`,
    tool: SCHEMA,
    stubResponse,
    maxTokens: 4096,
  });

  const aiGenerated = aiResult !== stubResponse;

  return { ...aiResult, disclaimer: CONTRACT_DISCLAIMER, aiGenerated };
}
