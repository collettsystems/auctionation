export interface ApiConfig {
  nodeEnv: string;
  host: string;
  port: number;
  databaseUrl: string;
  publicAppUrl: string;
  publicEmbedUrl: string;
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

export function loadConfig(): ApiConfig {
  return {
    nodeEnv: process.env.NODE_ENV ?? "development",
    host: process.env.API_HOST ?? "127.0.0.1",
    port: readNumber("API_PORT", 3000),
    databaseUrl: process.env.DATABASE_URL ?? "postgresql://auctionation:auctionation@localhost:5432/auctionation",
    publicAppUrl: process.env.PUBLIC_APP_URL ?? "http://localhost:5173",
    publicEmbedUrl: process.env.PUBLIC_EMBED_URL ?? "http://localhost:5174"
  };
}