import { Router } from "express";
import multer from "multer";
import { asyncHandler } from "../../common/asyncHandler";
import { requireAuth } from "../auth/middleware";
import { BadRequestError, UnauthorizedError } from "../../common/errors";
import * as service from "./service";
import * as insights from "./analysis/insightsService";
import { listTransactionsQuerySchema } from "./schemas";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const router = Router();
router.use(requireAuth);

router.post(
  "/upload",
  upload.single("statement"),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError();
    if (!req.file) throw new BadRequestError("No file uploaded. Attach it under the 'statement' field.");
    const result = await service.uploadStatement(req.user.sub, req.file);
    res.status(201).json(result);
  })
);

router.get(
  "/statements",
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError();
    res.json(await service.listStatements(req.user.sub));
  })
);

router.get(
  "/transactions",
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError();
    const { from, to, category, statementId } = listTransactionsQuerySchema.parse(req.query);
    const transactions = await service.listTransactions(req.user.sub, {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      category,
      statementId,
    });
    res.json(transactions);
  })
);

router.get(
  "/subscriptions",
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError();
    res.json(await service.listSubscriptions(req.user.sub));
  })
);

router.get(
  "/summary",
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError();
    res.json(await service.getSpendingSummary(req.user.sub));
  })
);

router.get(
  "/insights",
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError();
    res.json(await insights.getAllInsights(req.user.sub));
  })
);

router.get(
  "/insights/money-leaks",
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError();
    res.json(await insights.getMoneyLeaks(req.user.sub));
  })
);

router.get(
  "/insights/subscriptions",
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError();
    res.json(await insights.getSubscriptionInsight(req.user.sub));
  })
);

router.get(
  "/insights/tax",
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError();
    res.json(await insights.getTaxSuggestions(req.user.sub));
  })
);

router.get(
  "/insights/budget",
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError();
    res.json(await insights.getBudgetRecommendation(req.user.sub));
  })
);

router.get(
  "/insights/forecast",
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError();
    res.json(await insights.getForecast(req.user.sub));
  })
);

export default router;
