import { BadRequestError } from "../../../common/errors";
import { extractRawPdfText } from "../../../common/pdf";
import { extractMerchant } from "./formats";
import { parseFlexibleAmount, parseFlexibleDate } from "./dateUtils";
import { NormalizedTransaction, ParseResult } from "./types";

const LEADING_DATE = /^(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/;
const AMOUNT_TOKEN = /-?[\d,]+\.\d{2}/g;

/**
 * Best-effort line-by-line extraction for bank statement PDFs, which don't
 * have a stable table structure once converted to text. We treat each line
 * starting with a date as one transaction: description is the middle text,
 * amount is the second-to-last number on the line (last is usually the
 * running balance), and "Cr"/credit keywords flag it as a credit.
 */
export async function parsePdfStatement(buffer: Buffer): Promise<ParseResult> {
  if (!buffer || buffer.length === 0) {
    throw new BadRequestError("Uploaded file is empty");
  }

  let text: string;
  try {
    text = await extractRawPdfText(buffer);
  } catch {
    throw new BadRequestError("Could not read this PDF. It may be corrupt, image-based, or password-protected.");
  }

  if (!text || !text.trim()) {
    throw new BadRequestError(
      "No extractable text found in this PDF. Scanned/image-only statements are not supported yet — please upload a CSV export instead."
    );
  }

  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const transactions: NormalizedTransaction[] = [];
  let skipped = 0;

  for (const line of lines) {
    const dateMatch = line.match(LEADING_DATE);
    if (!dateMatch) continue;

    const date = parseFlexibleDate(dateMatch[1]);
    const rest = line.slice(dateMatch[0].length);
    const amountMatches = [...rest.matchAll(AMOUNT_TOKEN)];
    if (!date || amountMatches.length === 0) {
      skipped += 1;
      continue;
    }

    // Last number is usually the running balance; the one before it is the txn
    // amount. Truncating the description at that match's start (rather than
    // just stripping the trailing balance) also drops the amount itself and
    // any Cr/Dr marker between it and the balance.
    const targetMatch = amountMatches.length >= 2 ? amountMatches[amountMatches.length - 2] : amountMatches[amountMatches.length - 1];
    const amount = parseFlexibleAmount(targetMatch[0]);
    if (amount === null) {
      skipped += 1;
      continue;
    }

    const description = rest.slice(0, targetMatch.index).trim() || "Transaction";

    const isCredit = /\bcr\b/i.test(line) && !/\bdr\b/i.test(line);

    transactions.push({
      date,
      amount: Math.abs(amount),
      description,
      type: isCredit ? "CREDIT" : "DEBIT",
      merchant: extractMerchant(description),
    });
  }

  if (transactions.length === 0) {
    throw new BadRequestError(
      "Could not detect any transaction rows in this PDF. The layout may not be supported yet — please upload a CSV export instead."
    );
  }

  const warnings: string[] = [];
  if (skipped > 0) {
    warnings.push(`${skipped} line(s) looked like transactions but could not be parsed and were skipped.`);
  }
  warnings.push(
    "PDF parsing is best-effort and may misread merchant names, credit/debit direction, or amounts — please spot-check imported transactions."
  );

  return { bankFormat: "pdf_generic", transactions, warnings };
}
