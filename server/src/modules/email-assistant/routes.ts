import { Router } from "express";
import { asyncHandler } from "../../common/asyncHandler";
import { requireAuth, requireRole } from "../auth/middleware";
import { UnauthorizedError } from "../../common/errors";
import { generateDraftSchema, updateDraftSchema } from "./schemas";
import * as service from "./service";

const router = Router();
router.use(requireAuth, requireRole("CA"));

router.post(
  "/draft",
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError();
    const { clientId, originalEmail } = generateDraftSchema.parse(req.body);
    const draft = await service.generateDraft(req.user.sub, clientId, originalEmail);
    res.status(201).json(draft);
  })
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError();
    const clientId = typeof req.query.clientId === "string" ? req.query.clientId : undefined;
    res.json(await service.listDrafts(req.user.sub, clientId));
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError();
    res.json(await service.getDraft(req.user.sub, req.params.id));
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError();
    const { draftReply } = updateDraftSchema.parse(req.body);
    res.json(await service.updateDraft(req.user.sub, req.params.id, draftReply));
  })
);

router.post(
  "/:id/mark-sent",
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError();
    res.json(await service.markSent(req.user.sub, req.params.id));
  })
);

export default router;
