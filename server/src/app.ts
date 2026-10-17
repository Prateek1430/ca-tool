import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env } from "./config/env";
import { errorHandler } from "./common/errorHandler";
import authRoutes from "./modules/auth/routes";
import caClientRoutes from "./modules/ca-clients/routes";
import financeRoutes from "./modules/finance/routes";
import contractRoutes from "./modules/contracts/routes";
import emailAssistantRoutes from "./modules/email-assistant/routes";

export function createApp() {
  const app = express();

  // Vite auto-increments its port when the default is taken, so in
  // development we accept any localhost port in addition to the configured
  // origin(s) rather than hardcoding a single port.
  const isLocalhostDevOrigin = (origin: string) =>
    env.nodeEnv !== "production" && /^https?:\/\/localhost:\d+$/.test(origin);

  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || env.clientOrigins.includes(origin) || isLocalhostDevOrigin(origin)) {
          return callback(null, true);
        }
        // Deny without throwing: CORS only gates browser-side response visibility,
        // not backend access (that's the JWT middleware's job) — an error here would
        // just show up as a misleading 500 in logs for what is a normal rejection.
        return callback(null, false);
      },
      credentials: true,
    })
  );
  app.use(express.json({ limit: "2mb" }));

  // Baseline abuse protection for the whole API; /api/auth layers a much
  // stricter limiter on top of this for login/register specifically.
  app.use(
    "/api",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 600,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: "TooManyRequests", message: "Too many requests, please slow down." },
    })
  );

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/ca-clients", caClientRoutes);
  app.use("/api/finance", financeRoutes);
  app.use("/api/contracts", contractRoutes);
  app.use("/api/email-assistant", emailAssistantRoutes);

  app.use((req, res) => {
    res.status(404).json({ error: "NotFound", message: `No route for ${req.method} ${req.path}` });
  });

  app.use(errorHandler);

  return app;
}
