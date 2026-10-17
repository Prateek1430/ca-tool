export interface RedFlagPattern {
  phrase: RegExp;
  explanation: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
}

// Deterministic keyword scan used as a stub/sanity-check for risk-clause
// detection when no AI key is configured (or as a cross-check on AI output).
export const RED_FLAG_PATTERNS: RedFlagPattern[] = [
  {
    phrase: /sole discretion/i,
    explanation: "Gives one party unilateral decision-making power, which can be used against your interests.",
    severity: "MEDIUM",
  },
  {
    phrase: /unlimited liability|liability shall not be limited/i,
    explanation: "You (or the other party) may be exposed to uncapped financial liability.",
    severity: "HIGH",
  },
  {
    phrase: /non-refundable/i,
    explanation: "Payments made under this clause cannot be recovered even if the agreement ends early.",
    severity: "MEDIUM",
  },
  {
    phrase: /automatically renew|auto-renew/i,
    explanation: "The contract renews without active confirmation — you could be locked in if you miss the opt-out window.",
    severity: "MEDIUM",
  },
  {
    phrase: /waives? (all|any) rights?/i,
    explanation: "You may be giving up legal rights or remedies you'd otherwise have.",
    severity: "HIGH",
  },
  {
    phrase: /as[- ]is.{0,20}no warrant/i,
    explanation: "The other party disclaims responsibility for defects or issues with what's being provided.",
    severity: "MEDIUM",
  },
  {
    phrase: /irrevocable|perpetual/i,
    explanation: "This obligation/grant cannot be undone or has no end date, which can be riskier than a fixed term.",
    severity: "MEDIUM",
  },
  {
    phrase: /unilaterally (modify|amend|change)/i,
    explanation: "One party can change terms without your consent.",
    severity: "HIGH",
  },
  {
    phrase: /liquidated damages/i,
    explanation: "Pre-agreed penalty amounts apply on breach — worth checking these aren't disproportionate.",
    severity: "LOW",
  },
];

export interface DetectedRedFlag {
  clauseText: string;
  explanation: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
}

export function detectRedFlagClauses(text: string): DetectedRedFlag[] {
  const sentences = text.split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter(Boolean);
  const found: DetectedRedFlag[] = [];

  for (const sentence of sentences) {
    for (const pattern of RED_FLAG_PATTERNS) {
      if (pattern.phrase.test(sentence)) {
        found.push({ clauseText: sentence.slice(0, 300), explanation: pattern.explanation, severity: pattern.severity });
        break;
      }
    }
  }

  return found.slice(0, 20);
}
