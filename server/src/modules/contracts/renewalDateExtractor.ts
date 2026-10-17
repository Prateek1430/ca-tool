import { parseFlexibleDate } from "../finance/parsers/dateUtils";

const RENEWAL_KEYWORDS = /renew|expir|valid until|valid till|term of this agreement/i;
const DATE_PATTERN = /(\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}-\d{1,2}-\d{1,2}|\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})/;

export interface RenewalHeuristicResult {
  renewalDate: Date | null;
  matchedSentence: string | null;
  autoRenewal: boolean;
}

/**
 * Best-effort deterministic scan for a renewal/expiry date near relevant
 * keywords, used as a sanity check against (and fallback for) the AI's
 * extraction since dates are high-stakes to get wrong.
 */
export function extractRenewalHeuristic(text: string): RenewalHeuristicResult {
  const sentences = text.split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter(Boolean);
  const autoRenewal = /automatically renew|auto-renew|shall renew automatically/i.test(text);

  for (const sentence of sentences) {
    if (!RENEWAL_KEYWORDS.test(sentence)) continue;
    const match = sentence.match(DATE_PATTERN);
    if (match) {
      const date = parseFlexibleDate(match[1]);
      if (date) {
        return { renewalDate: date, matchedSentence: sentence.slice(0, 300), autoRenewal };
      }
    }
  }

  return { renewalDate: null, matchedSentence: null, autoRenewal };
}
