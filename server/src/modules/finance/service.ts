import { prisma } from "../../common/prisma";
import { encrypt, decrypt } from "../../common/encryption";
import { BadRequestError } from "../../common/errors";
import { parseCsvStatement } from "./parsers/csvParser";
import { parsePdfStatement } from "./parsers/pdfParser";
import { categorizeTransaction } from "./categorizer";
import { detectRecurring } from "./recurringDetector";
import { NormalizedTransaction } from "./parsers/types";

const ALLOWED_CSV_MIME = new Set(["text/csv", "application/vnd.ms-excel", "application/csv", "text/plain"]);
const ALLOWED_PDF_MIME = new Set(["application/pdf"]);
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB

export interface UploadedFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

function isCsv(file: UploadedFile): boolean {
  return ALLOWED_CSV_MIME.has(file.mimetype) || file.originalname.toLowerCase().endsWith(".csv");
}

function isPdf(file: UploadedFile): boolean {
  return ALLOWED_PDF_MIME.has(file.mimetype) || file.originalname.toLowerCase().endsWith(".pdf");
}

export async function uploadStatement(userId: string, file: UploadedFile) {
  if (!file) {
    throw new BadRequestError("No file uploaded");
  }
  if (file.size === 0) {
    throw new BadRequestError("Uploaded file is empty");
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new BadRequestError("File too large (max 10MB)");
  }

  let parsed: { bankFormat: string; transactions: NormalizedTransaction[]; warnings: string[] };
  let sourceType: "CSV" | "PDF";

  if (isCsv(file)) {
    sourceType = "CSV";
    parsed = parseCsvStatement(file.buffer);
  } else if (isPdf(file)) {
    sourceType = "PDF";
    parsed = await parsePdfStatement(file.buffer);
  } else {
    throw new BadRequestError("Unsupported file type. Please upload a CSV or PDF bank/UPI/credit-card statement.");
  }

  // Guard against duplicate imports (re-uploading the same file, or a new
  // export whose date range overlaps a previous one) — without this, the
  // same real-world transaction gets double-counted in totals/budgets/forecasts,
  // and same-day duplicate entries also break recurrence detection (a 0-day
  // gap between "two" occurrences fails the monthly/weekly range check).
  const existing = await prisma.transaction.findMany({
    where: { userId },
    select: { date: true, amount: true, merchant: true, type: true },
  });
  const existingFingerprints = new Set(
    existing.map((t) => `${t.date.getTime()}|${t.amount}|${t.merchant.toLowerCase().trim()}|${t.type}`)
  );

  const newTransactions = parsed.transactions.filter(
    (t) => !existingFingerprints.has(`${t.date.getTime()}|${t.amount}|${t.merchant.toLowerCase().trim()}|${t.type}`)
  );
  const duplicatesSkipped = parsed.transactions.length - newTransactions.length;

  const statement = await prisma.statement.create({
    data: {
      userId,
      filename: file.originalname,
      sourceType,
      bankFormat: parsed.bankFormat,
    },
  });

  if (newTransactions.length > 0) {
    await prisma.transaction.createMany({
      data: newTransactions.map((t) => ({
        userId,
        statementId: statement.id,
        date: t.date,
        amount: t.amount,
        descriptionEnc: encrypt(t.description),
        category: categorizeTransaction(t.description, t.merchant),
        type: t.type,
        merchant: t.merchant,
        isRecurring: false,
      })),
    });
  }

  // Recompute recurrence across the user's FULL transaction history (not just
  // this upload) so subscriptions split across separate monthly uploads are
  // still detected.
  const allTransactions = await prisma.transaction.findMany({
    where: { userId },
    select: { merchant: true, amount: true, date: true, type: true },
  });
  const recurring = detectRecurring(allTransactions);

  for (const r of recurring) {
    await prisma.transaction.updateMany({
      where: { userId, merchant: { equals: r.merchant, mode: "insensitive" } },
      data: { isRecurring: true },
    });
    await prisma.subscription.upsert({
      where: { userId_merchant: { userId, merchant: r.merchant } },
      update: { amount: r.amount, frequency: r.frequency, lastSeen: r.lastSeen, status: "ACTIVE" },
      create: {
        userId,
        merchant: r.merchant,
        amount: r.amount,
        frequency: r.frequency,
        lastSeen: r.lastSeen,
        status: "ACTIVE",
      },
    });
  }

  // Invalidate cached AI insights so the next dashboard view regenerates them
  // against the freshly uploaded data instead of showing stale numbers.
  await prisma.financeInsight.deleteMany({ where: { userId } });

  const warnings = [...parsed.warnings];
  if (duplicatesSkipped > 0) {
    warnings.push(
      `${duplicatesSkipped} transaction(s) matched ones already on file (same date, amount, merchant) and were skipped as duplicates.`
    );
  }

  return {
    statementId: statement.id,
    bankFormat: parsed.bankFormat,
    sourceType,
    transactionsImported: newTransactions.length,
    duplicatesSkipped,
    recurringMerchantsDetected: recurring.length,
    warnings,
  };
}

export async function listStatements(userId: string) {
  return prisma.statement.findMany({
    where: { userId },
    orderBy: { uploadedAt: "desc" },
    include: { _count: { select: { transactions: true } } },
  });
}

export async function listTransactions(
  userId: string,
  filters: { from?: Date; to?: Date; category?: string; statementId?: string }
) {
  const rows = await prisma.transaction.findMany({
    where: {
      userId,
      statementId: filters.statementId,
      category: filters.category,
      date: {
        gte: filters.from,
        lte: filters.to,
      },
    },
    orderBy: { date: "desc" },
  });

  return rows.map((r) => ({
    id: r.id,
    date: r.date,
    amount: r.amount,
    description: decrypt(r.descriptionEnc),
    category: r.category,
    type: r.type,
    merchant: r.merchant,
    isRecurring: r.isRecurring,
  }));
}

export async function listSubscriptions(userId: string) {
  return prisma.subscription.findMany({ where: { userId }, orderBy: { lastSeen: "desc" } });
}

export async function getSpendingSummary(userId: string) {
  const transactions = await prisma.transaction.findMany({ where: { userId } });

  const byCategory = new Map<string, number>();
  const byMonth = new Map<string, { income: number; expense: number }>();
  let totalIncome = 0;
  let totalExpense = 0;

  for (const t of transactions) {
    if (t.type === "DEBIT") {
      totalExpense += t.amount;
      byCategory.set(t.category, (byCategory.get(t.category) ?? 0) + t.amount);
    } else {
      totalIncome += t.amount;
    }

    const monthKey = `${t.date.getUTCFullYear()}-${String(t.date.getUTCMonth() + 1).padStart(2, "0")}`;
    const bucket = byMonth.get(monthKey) ?? { income: 0, expense: 0 };
    if (t.type === "DEBIT") bucket.expense += t.amount;
    else bucket.income += t.amount;
    byMonth.set(monthKey, bucket);
  }

  const savingsRate = totalIncome > 0 ? Math.max(0, (totalIncome - totalExpense) / totalIncome) : 0;

  return {
    totalIncome,
    totalExpense,
    savingsRate,
    spendingByCategory: Array.from(byCategory.entries()).map(([category, amount]) => ({ category, amount })),
    monthlyTrend: Array.from(byMonth.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([month, v]) => ({ month, ...v })),
    transactionCount: transactions.length,
  };
}
