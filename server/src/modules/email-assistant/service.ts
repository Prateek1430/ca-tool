import { prisma } from "../../common/prisma";
import { ForbiddenError, NotFoundError } from "../../common/errors";
import { askForJson } from "../../ai/client";
import { assertCaHasAccessToClient } from "../ca-clients/service";
import { buildClientContext } from "./contextBuilder";

const SCHEMA = {
  name: "draft_email_reply",
  description: "Draft a professional reply to a client's email on behalf of their Chartered Accountant.",
  inputSchema: {
    type: "object",
    properties: {
      subject: { type: "string" },
      body: { type: "string", description: "Full email body, professional tone, referencing relevant client data where helpful." },
    },
    required: ["subject", "body"],
  },
};

export async function generateDraft(caId: string, clientId: string, originalEmail: string) {
  await assertCaHasAccessToClient(caId, clientId);
  const context = await buildClientContext(clientId);

  const stubResponse = {
    subject: "Re: Your query",
    body:
      "Hi,\n\nThank you for reaching out. I've reviewed your recent financial summary and will get back to you shortly with a detailed response.\n\n" +
      "(This is a placeholder draft — configure ANTHROPIC_API_KEY to generate a context-aware reply automatically.)\n\nBest regards,",
  };

  const { subject, body } = await askForJson<typeof stubResponse>({
    system:
      "You are drafting an email reply on behalf of a Chartered Accountant, to send to their client. Be professional, concise, and reference the client's actual financial context where relevant. Never state certainties about tax/legal outcomes — the CA will review and edit before sending. Do not fabricate numbers beyond what's given in the context.",
    prompt: `Client's original email:\n"""${originalEmail}"""\n\nClient context (for grounding your reply, do not dump this verbatim):\n${JSON.stringify(context, null, 2)}\n\nDraft a reply the CA can review and send.`,
    tool: SCHEMA,
    stubResponse,
  });

  const draft = await prisma.emailDraft.create({
    data: {
      caId,
      clientId,
      originalEmail,
      draftReply: `Subject: ${subject}\n\n${body}`,
      context: JSON.parse(JSON.stringify(context)),
      status: "DRAFT",
    },
  });

  return draft;
}

async function assertOwnedByCA(caId: string, draftId: string) {
  const draft = await prisma.emailDraft.findUnique({ where: { id: draftId } });
  if (!draft) throw new NotFoundError("Draft not found");
  if (draft.caId !== caId) throw new ForbiddenError("This draft does not belong to you");
  return draft;
}

export async function updateDraft(caId: string, draftId: string, draftReply: string) {
  await assertOwnedByCA(caId, draftId);
  return prisma.emailDraft.update({
    where: { id: draftId },
    data: { draftReply, status: "EDITED" },
  });
}

/**
 * Marks a draft as sent in our own records only — this app never dispatches
 * real email (no SMTP integration), by design, so a CA always sends manually
 * from their own email client after reviewing.
 */
export async function markSent(caId: string, draftId: string) {
  await assertOwnedByCA(caId, draftId);
  return prisma.emailDraft.update({ where: { id: draftId }, data: { status: "SENT" } });
}

export async function listDrafts(caId: string, clientId?: string) {
  return prisma.emailDraft.findMany({
    where: { caId, clientId },
    orderBy: { createdAt: "desc" },
    include: { client: { select: { id: true, name: true, email: true } } },
  });
}

export async function getDraft(caId: string, draftId: string) {
  return assertOwnedByCA(caId, draftId);
}
