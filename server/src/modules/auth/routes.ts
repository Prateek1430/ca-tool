import { Router } from "express";
import rateLimit from "express-rate-limit";
import { asyncHandler } from "../../common/asyncHandler";
import { requireAuth } from "./middleware";
import { registerSchema, loginSchema } from "./schemas";
import * as authService from "./service";
import { UnauthorizedError } from "../../common/errors";

const router = Router();

// Slow down brute-force login/register attempts without blocking normal usage.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "TooManyRequests", message: "Too many attempts, please try again later." },
});

router.post(
  "/register",
  authLimiter,
  asyncHandler(async (req, res) => {
    const input = registerSchema.parse(req.body);
    const result = await authService.register(input);
    res.status(201).json(result);
  })
);

router.post(
  "/login",
  authLimiter,
  asyncHandler(async (req, res) => {
    const input = loginSchema.parse(req.body);
    const result = await authService.login(input);
    res.status(200).json(result);
  })
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!req.user) throw new UnauthorizedError();
    const profile = await authService.getProfile(req.user.sub);
    res.json(profile);
  })
);

export default router;
