export interface ApiConfig {
  nodeEnv: string;
  host: string;
  port: number;
  databaseUrl: string;
  publicAppUrl: string;
  publicEmbedUrl: string;
  corsOrigins: string[];
  adminApiKey?: string;
  adminApiKeyRequired: boolean;
}

function readNumber(name: string, fallback: number): number {
  const value = process.env[name];
  if (!value) return fallback;

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Environment variable ${name} must be a number.`);
  }

  return parsed;
}

function readCsv(name: string): string[] | undefined {
  const value = process.env[name];
  if (!value) return undefined;

  const entries = value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  return entries.length > 0 ? entries : undefined;
}

export function loadConfig(): ApiConfig {
  const publicAppUrl = process.env.PUBLIC_APP_URL ?? "http://localhost:5173";
  const publicEmbedUrl = process.env.PUBLIC_EMBED_URL ?? "http://localhost:5174";
  const nodeEnv = process.env.NODE_ENV ?? "development";
  const adminApiKey = process.env.ADMIN_API_KEY?.trim() || undefined;
  const adminApiKeyRequired = process.env.ADMIN_API_KEY_REQUIRED
    ? process.env.ADMIN_API_KEY_REQUIRED !== "false"
    : nodeEnv !== "development";

  if (adminApiKeyRequired && !adminApiKey) {
    throw new Error("ADMIN_API_KEY must be set when admin API key protection is required.");
  }

  return {
    nodeEnv,
    host: process.env.API_HOST ?? "127.0.0.1",
    port: readNumber("API_PORT", 3000),
    databaseUrl: process.env.DATABASE_URL ?? "postgresql://auctionation:auctionation@localhost:5432/auctionation",
    publicAppUrl,
    publicEmbedUrl,
    corsOrigins: readCsv("CORS_ORIGINS") ?? [publicAppUrl, publicEmbedUrl],
    adminApiKey,
    adminApiKeyRequired
  };
}
