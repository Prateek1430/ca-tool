export interface StandardClause {
  name: string;
  keywords: string[];
  whyItMatters: string;
}

// Deterministic keyword presence-check used both as a safety net when no AI
// key is configured, and to sanity-check the AI's "missing clauses" output.
export const STANDARD_CLAUSES: StandardClause[] = [
  {
    name: "Termination",
    keywords: ["terminat"],
    whyItMatters: "Without a clear termination clause, it may be unclear how either party can exit the agreement.",
  },
  {
    name: "Indemnity",
    keywords: ["indemnif", "indemnity"],
    whyItMatters: "Without an indemnity clause, it's unclear who bears the cost if a third-party claim arises from this agreement.",
  },
  {
    name: "Confidentiality",
    keywords: ["confidential", "non-disclosure", "nda"],
    whyItMatters: "Without confidentiality terms, sensitive information shared during the engagement may not be protected.",
  },
  {
    name: "Limitation of Liability",
    keywords: ["limitation of liability", "limited liability", "liability shall not exceed"],
    whyItMatters: "Without this clause, liability exposure in case of breach or damages may be uncapped.",
  },
  {
    name: "Governing Law / Jurisdiction",
    keywords: ["governing law", "jurisdiction", "governed by the laws"],
    whyItMatters: "Without this, it's unclear which country/state's laws and courts apply in a dispute.",
  },
  {
    name: "Dispute Resolution",
    keywords: ["dispute resolution", "arbitration", "mediation"],
    whyItMatters: "Without this, resolving disagreements may default to costly litigation instead of arbitration/mediation.",
  },
  {
    name: "Force Majeure",
    keywords: ["force majeure", "act of god"],
    whyItMatters: "Without this, obligations may not be excused during events outside either party's control (natural disasters, pandemics, etc.).",
  },
  {
    name: "Payment Terms",
    keywords: ["payment terms", "invoice", "due date", "fees payable"],
    whyItMatters: "Without clear payment terms, timing and method of payment may be disputed.",
  },
];

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Left-word-boundary matching (no trailing \b) avoids false positives like "nda"
// inside "refundable" or "limited liability" inside "unlimited liability" (the
// opposite meaning), while still allowing intentional stems ("terminat" matching
// "terminated"/"termination") to match their suffixes.
function containsKeyword(text: string, keyword: string): boolean {
  return new RegExp(`\\b${escapeRegex(keyword)}`, "i").test(text);
}

export function findMissingStandardClauses(text: string): StandardClause[] {
  return STANDARD_CLAUSES.filter((clause) => !clause.keywords.some((k) => containsKeyword(text, k)));
}
