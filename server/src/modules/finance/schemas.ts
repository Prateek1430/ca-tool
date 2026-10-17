import { z } from "zod";

const emptyToUndefined = (v: unknown) => (v === "" ? undefined : v);

const isoDateString = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .refine((v) => !Number.isNaN(new Date(v).getTime()), "Must be a valid date")
    .optional()
);

export const listTransactionsQuerySchema = z.object({
  from: isoDateString,
  to: isoDateString,
  category: z.preprocess(emptyToUndefined, z.string().min(1).max(100).optional()),
  statementId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
});
