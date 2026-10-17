export interface NormalizedTransaction {
  date: Date;
  amount: number;
  description: string;
  type: "DEBIT" | "CREDIT";
  merchant: string;
}

export interface ParseResult {
  bankFormat: string;
  transactions: NormalizedTransaction[];
  warnings: string[];
}

export interface BankFormatDefinition {
  id: string;
  label: string;
  /** Returns true if this parser's expected header columns are present. */
  matches: (headers: string[]) => boolean;
  parse: (rows: Record<string, string>[]) => NormalizedTransaction[];
}
