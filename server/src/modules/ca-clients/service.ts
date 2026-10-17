import { LinkStatus } from "@prisma/client";
import { prisma } from "../../common/prisma";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "../../common/errors";

export async function inviteClient(caId: string, clientEmail: string) {
  const client = await prisma.user.findUnique({ where: { email: clientEmail } });
  if (!client) {
    throw new NotFoundError("No account found with that email");
  }
  if (client.role !== "USER") {
    throw new BadRequestError("Only individual users can be invited as clients");
  }
  if (client.id === caId) {
    throw new BadRequestError("You cannot invite yourself");
  }

  const existing = await prisma.caClientLink.findUnique({
    where: { caId_clientId: { caId, clientId: client.id } },
  });

  if (existing && existing.status !== "REVOKED") {
    throw new ConflictError("An invite or active link already exists for this client");
  }

  if (existing) {
    return prisma.caClientLink.update({
      where: { id: existing.id },
      data: { status: "PENDING", invitedAt: new Date(), respondedAt: null },
    });
  }

  return prisma.caClientLink.create({
    data: { caId, clientId: client.id, status: "PENDING" },
  });
}

export async function respondToInvite(clientId: string, linkId: string, accept: boolean) {
  const link = await prisma.caClientLink.findUnique({ where: { id: linkId } });
  if (!link) throw new NotFoundError("Invite not found");
  if (link.clientId !== clientId) throw new ForbiddenError("This invite does not belong to you");
  if (link.status !== "PENDING") throw new BadRequestError("Invite already responded to");

  return prisma.caClientLink.update({
    where: { id: linkId },
    data: { status: accept ? "ACCEPTED" : "REVOKED", respondedAt: new Date() },
  });
}

export async function revokeLink(userId: string, linkId: string) {
  const link = await prisma.caClientLink.findUnique({ where: { id: linkId } });
  if (!link) throw new NotFoundError("Link not found");
  if (link.caId !== userId && link.clientId !== userId) {
    throw new ForbiddenError("This link does not belong to you");
  }
  return prisma.caClientLink.update({
    where: { id: linkId },
    data: { status: "REVOKED", respondedAt: new Date() },
  });
}

export async function listPendingInvitesForClient(clientId: string) {
  return prisma.caClientLink.findMany({
    where: { clientId, status: "PENDING" },
    include: { ca: { select: { id: true, name: true, email: true } } },
  });
}

export async function listClientsForCa(caId: string, status?: LinkStatus) {
  return prisma.caClientLink.findMany({
    where: { caId, ...(status ? { status } : {}) },
    include: { client: { select: { id: true, name: true, email: true } } },
  });
}

export async function listCasForClient(clientId: string) {
  return prisma.caClientLink.findMany({
    where: { clientId, status: "ACCEPTED" },
    include: { ca: { select: { id: true, name: true, email: true } } },
  });
}

/**
 * Access-control gate: throws unless `caId` has an ACCEPTED link to `clientId`.
 * Every CA-facing read of client finance/contract data must call this first.
 */
export async function assertCaHasAccessToClient(caId: string, clientId: string) {
  const link = await prisma.caClientLink.findUnique({
    where: { caId_clientId: { caId, clientId } },
  });
  if (!link || link.status !== "ACCEPTED") {
    throw new ForbiddenError("You do not have access to this client's data");
  }
}
