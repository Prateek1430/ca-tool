import { z } from "zod";

export const inviteClientSchema = z.object({
  clientEmail: z.string().trim().toLowerCase().email("Invalid email address"),
});

export type InviteClientInput = z.infer<typeof inviteClientSchema>;
