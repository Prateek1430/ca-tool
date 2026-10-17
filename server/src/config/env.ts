import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  dataEncKey: required("DATA_ENC_KEY"),
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  anthropicModel: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5",
  clientOrigins: (process.env.CLIENT_ORIGIN ?? "http://localhost:5173")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
  nodeEnv: process.env.NODE_ENV ?? "development",
};

if (env.dataEncKey.length !== 64) {
  throw new Error("DATA_ENC_KEY must be exactly 64 hex characters (32 bytes)");
}

if (!env.anthropicApiKey) {
  // eslint-disable-next-line no-console
  console.warn(
    "[config] ANTHROPIC_API_KEY not set — AI features will return stubbed responses."
  );
}
