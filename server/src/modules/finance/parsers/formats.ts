import { BankFormatDefinition, NormalizedTransaction } from "./types";
import { parseFlexibleAmount, parseFlexibleDate } from "./dateUtils";

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeRow(row: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(row)) {
    out[normalizeHeader(key)] = value ?? "";
  }
  return out;
}

function firstMatch(row: Record<string, string>, candidates: string[]): string {
  for (const c of candidates) {
    if (row[c] !== undefined && row[c] !== "") return row[c];
  }
  return "";
}

function hasAllHeaders(headers: string[], required: string[]): boolean {
  const normalized = headers.map(normalizeHeader);
  return required.every((r) => normalized.includes(r));
}

function hasAnyHeaderSet(headers: string[], candidateSets: string[][]): boolean {
  const normalized = headers.map(normalizeHeader);
  return candidateSets.every((set) => set.some((c) => normalized.includes(c)));
}

/** HDFC Bank savings/current account CSV export. */
const hdfc: BankFormatDefinition = {
  id: "hdfc",
  label: "HDFC Bank",
  matches: (headers) =>
    hasAnyHeaderSet(headers, [["date"], ["narration"], ["withdrawal amt.", "debit amount"], ["deposit amt.", "credit amount"]]),
  parse: (rows) =>
    buildTransactions(rows, {
      date: ["date", "value dat"],
      description: ["narration"],
      debit: ["withdrawal amt.", "debit amount"],
      credit: ["deposit amt.", "credit amount"],
    }),
};

/** ICICI Bank savings/current account CSV export. */
const icici: BankFormatDefinition = {
  id: "icici",
  label: "ICICI Bank",
  matches: (headers) =>
    hasAnyHeaderSet(headers, [
      ["transaction date"],
      ["transaction remarks"],
      ["withdrawal amount (inr)"],
      ["deposit amount (inr)"],
    ]),
  parse: (rows) =>
    buildTransactions(rows, {
      date: ["transaction date"],
      description: ["transaction remarks"],
      debit: ["withdrawal amount (inr)"],
      credit: ["deposit amount (inr)"],
    }),
};

/** SBI savings/current account CSV export. */
const sbi: BankFormatDefinition = {
  id: "sbi",
  label: "State Bank of India",
  matches: (headers) => hasAnyHeaderSet(headers, [["txn date"], ["description"], ["debit"], ["credit"]]),
  parse: (rows) =>
    buildTransactions(rows, {
      date: ["txn date"],
      description: ["description"],
      debit: ["debit"],
      credit: ["credit"],
    }),
};

/** Generic UPI app export (PhonePe/GPay/Paytm-style) with a signed amount + type column. */
const genericUpi: BankFormatDefinition = {
  id: "generic_upi",
  label: "Generic UPI Export",
  matches: (headers) =>
    hasAllHeaders(headers, ["date"]) &&
    (hasAllHeaders(headers, ["amount", "type"]) || hasAllHeaders(headers, ["amount", "transaction type"])),
  parse: (rows) =>
    rows
      .map(normalizeRow)
      .map((row) => {
        const date = parseFlexibleDate(firstMatch(row, ["date", "transaction date"]));
        const amountRaw = parseFlexibleAmount(firstMatch(row, ["amount"]));
        const typeRaw = firstMatch(row, ["type", "transaction type"]).toLowerCase();
        const description = firstMatch(row, ["description", "details", "remarks", "narration"]) || "UPI Transaction";
        if (!date || amountRaw === null) return null;
        const type: "DEBIT" | "CREDIT" = typeRaw.includes("credit") || typeRaw.includes("received") ? "CREDIT" : "DEBIT";
        return {
          date,
          amount: Math.abs(amountRaw),
          description,
          type,
          merchant: extractMerchant(description),
        } satisfies NormalizedTransaction;
      })
      .filter((t): t is NormalizedTransaction => t !== null),
};

/** Credit card statement: single signed "Amount" column, negative = payment/credit. */
const genericCreditCard: BankFormatDefinition = {
  id: "generic_credit_card",
  label: "Generic Credit Card Statement",
  matches: (headers) => hasAllHeaders(headers, ["date", "description", "amount"]),
  parse: (rows) =>
    rows
      .map(normalizeRow)
      .map((row) => {
        const date = parseFlexibleDate(firstMatch(row, ["date"]));
        const amountRaw = parseFlexibleAmount(firstMatch(row, ["amount"]));
        const description = firstMatch(row, ["description"]) || "Card Transaction";
        if (!date || amountRaw === null) return null;
        const type: "DEBIT" | "CREDIT" = amountRaw < 0 ? "CREDIT" : "DEBIT";
        return {
          date,
          amount: Math.abs(amountRaw),
          description,
          type,
          merchant: extractMerchant(description),
        } satisfies NormalizedTransaction;
      })
      .filter((t): t is NormalizedTransaction => t !== null),
};

function buildTransactions(
  rows: Record<string, string>[],
  columns: { date: string[]; description: string[]; debit: string[]; credit: string[] }
): NormalizedTransaction[] {
  return rows
    .map(normalizeRow)
    .map((row) => {
      const date = parseFlexibleDate(firstMatch(row, columns.date));
      const description = firstMatch(row, columns.description) || "Transaction";
      const debit = parseFlexibleAmount(firstMatch(row, columns.debit));
      const credit = parseFlexibleAmount(firstMatch(row, columns.credit));
      if (!date) return null;
      if ((debit === null || debit === 0) && (credit === null || credit === 0)) return null;

      const type: "DEBIT" | "CREDIT" = credit && credit > 0 ? "CREDIT" : "DEBIT";
      const amount = type === "CREDIT" ? (credit as number) : (debit as number);
      return { date, amount: Math.abs(amount), description, type, merchant: extractMerchant(description) } satisfies NormalizedTransaction;
    })
    .filter((t): t is NormalizedTransaction => t !== null);
}

// UPI VPA handle suffixes / PSP names — not merchant identity, so they're dropped
// once at least one other token survives (narrations like "UPI-NETFLIX-netflix@hdfcbank-000112"
// otherwise resolve to "hdfcbank" instead of "Netflix").
const PSP_HANDLE_TOKENS = new Set([
  "hdfcbank", "icici", "icicibank", "sbi", "ybl", "oksbi", "okaxis", "okhdfcbank",
  "paytm", "axl", "ibl", "axisbank", "kotak", "yesbank", "idfcfirst", "apl",
]);

/** Best-effort merchant name extraction from a raw bank narration string. */
export function extractMerchant(description: string): string {
  const cleaned = description
    .replace(/UPI[-/]/gi, "")
    .replace(/\b\d{6,}\b/g, "")
    .replace(/[-/@]+/g, " ")
    .trim();

  const seen = new Set<string>();
  const parts = cleaned
    .split(" ")
    .filter(Boolean)
    .filter((p) => {
      const key = p.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  const meaningful = parts.filter((p) => !PSP_HANDLE_TOKENS.has(p.toLowerCase()));
  const chosen = (meaningful.length > 0 ? meaningful : parts).slice(0, 3).join(" ");
  return (chosen || description).slice(0, 80);
}

export const BANK_FORMATS: BankFormatDefinition[] = [hdfc, icici, sbi, genericUpi, genericCreditCard];
