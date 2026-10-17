import { z } from "zod";

export const generateDraftSchema = z.object({
  clientId: z.string().uuid("Invalid client id"),
  originalEmail: z.string().trim().min(1, "Original email text is required").max(20000),
});

export const updateDraftSchema = z.object({
  draftReply: z.string().trim().min(1, "Draft reply cannot be empty").max(20000),
});

export type GenerateDraftInput = z.infer<typeof generateDraftSchema>;
export type UpdateDraftInput = z.infer<typeof updateDraftSchema>;
