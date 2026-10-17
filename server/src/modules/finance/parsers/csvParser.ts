import { parse } from "csv-parse/sync";
import { BadRequestError } from "../../../common/errors";
import { BANK_FORMATS } from "./formats";
import { ParseResult } from "./types";

export function parseCsvStatement(buffer: Buffer): ParseResult {
  if (!buffer || buffer.length === 0) {
    throw new BadRequestError("Uploaded file is empty");
  }

  let rows: Record<string, string>[];
  try {
    rows = parse(buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
      bom: true,
    });
  } catch {
    throw new BadRequestError(
      "Could not read this file as CSV. It may be corrupt or in an unsupported encoding."
    );
  }

  if (rows.length === 0) {
    throw new BadRequestError("CSV file has no data rows");
  }

  const headers = Object.keys(rows[0]);
  const format = BANK_FORMATS.find((f) => f.matches(headers));

  if (!format) {
    throw new BadRequestError(
      `Unrecognized statement format. Detected columns: ${headers.join(", ") || "none"}. ` +
        "Supported formats: HDFC, ICICI, SBI, generic UPI export, generic credit card export."
    );
  }

  const transactions = format.parse(rows);
  const warnings: string[] = [];
  const skipped = rows.length - transactions.length;
  if (skipped > 0) {
    warnings.push(`${skipped} row(s) could not be parsed (missing/invalid date or amount) and were skipped.`);
  }
  if (transactions.length === 0) {
    throw new BadRequestError(
      `Matched format "${format.label}" but no valid transactions could be extracted from any row.`
    );
  }

  return { bankFormat: format.id, transactions, warnings };
}
