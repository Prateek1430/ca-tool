import { Router } from "express";
import { asyncHandler } from "../../common/asyncHandler";
import { requireAuth, requireRole } from "../auth/middleware";
import { UnauthorizedError } from "../../common/errors";
import { inviteClientSchema } from "./schemas";
import * as service from "./service";
import * as financeService from "../finance/service";
import * as insightsService from "../finance/analysis/insightsService";
import * as contractsService from "../contracts/service";

const router = Router();

router.use(requireAuth);

router.post(
  "/invite",
  requireRole("CA"),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError();
    const { clientEmail } = inviteClientSchema.parse(req.body);
    const link = await service.inviteClient(req.user.sub, clientEmail);
    res.status(201).json(link);
  })
);

router.get(
  "/invites",
  requireRole("USER"),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError();
    const invites = await service.listPendingInvitesForClient(req.user.sub);
    res.json(invites);
  })
);

router.post(
  "/invites/:linkId/accept",
  requireRole("USER"),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError();
    const link = await service.respondToInvite(req.user.sub, req.params.linkId, true);
    res.json(link);
  })
);

router.post(
  "/invites/:linkId/decline",
  requireRole("USER"),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError();
    const link = await service.respondToInvite(req.user.sub, req.params.linkId, false);
    res.json(link);
  })
);

router.post(
  "/links/:linkId/revoke",
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError();
    const link = await service.revokeLink(req.user.sub, req.params.linkId);
    res.json(link);
  })
);

const CLIENT_LINK_STATUSES = ["PENDING", "ACCEPTED", "REVOKED"] as const;

router.get(
  "/clients",
  requireRole("CA"),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError();
    const { status } = req.query;
    if (status === "ALL") {
      return res.json(await service.listClientsForCa(req.user.sub));
    }
    const filter =
      typeof status === "string" && (CLIENT_LINK_STATUSES as readonly string[]).includes(status)
        ? (status as (typeof CLIENT_LINK_STATUSES)[number])
        : "ACCEPTED";
    const clients = await service.listClientsForCa(req.user.sub, filter);
    res.json(clients);
  })
);

router.get(
  "/mine",
  requireRole("USER"),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError();
    const cas = await service.listCasForClient(req.user.sub);
    res.json(cas);
  })
);

// CA-facing read access to an accepted client's data. Every route below
// re-checks the ACCEPTED link server-side (assertCaHasAccessToClient) even
// though the client list already filters by it, so a CA can never bypass
// access control by guessing another user's id.

router.get(
  "/clients/:clientId/finance-summary",
  requireRole("CA"),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError();
    await service.assertCaHasAccessToClient(req.user.sub, req.params.clientId);
    res.json(await financeService.getSpendingSummary(req.params.clientId));
  })
);

router.get(
  "/clients/:clientId/insights",
  requireRole("CA"),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError();
    await service.assertCaHasAccessToClient(req.user.sub, req.params.clientId);
    res.json(await insightsService.getAllInsights(req.params.clientId));
  })
);

router.get(
  "/clients/:clientId/contracts",
  requireRole("CA"),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError();
    await service.assertCaHasAccessToClient(req.user.sub, req.params.clientId);
    res.json(await contractsService.listContracts(req.params.clientId));
  })
);

router.get(
  "/clients/:clientId/contracts/:contractId",
  requireRole("CA"),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError();
    await service.assertCaHasAccessToClient(req.user.sub, req.params.clientId);
    res.json(await contractsService.getContractById(req.params.clientId, req.params.contractId));
  })
);

export default router;
