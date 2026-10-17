import { Router } from "express";
import multer from "multer";
import { asyncHandler } from "../../common/asyncHandler";
import { requireAuth } from "../auth/middleware";
import { BadRequestError, UnauthorizedError } from "../../common/errors";
import * as service from "./service";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

const router = Router();
router.use(requireAuth);

router.post(
  "/upload",
  upload.single("contract"),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError();
    if (!req.file) throw new BadRequestError("No file uploaded. Attach it under the 'contract' field.");
    const result = await service.uploadContract(req.user.sub, req.file);
    res.status(201).json(result);
  })
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError();
    res.json(await service.listContracts(req.user.sub));
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError();
    res.json(await service.getContractById(req.user.sub, req.params.id));
  })
);

router.get(
  "/:id/text",
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError();
    const text = await service.getContractFullText(req.user.sub, req.params.id);
    res.json({ text });
  })
);

export default router;
