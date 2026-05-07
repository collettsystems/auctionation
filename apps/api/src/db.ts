import { Pool } from "pg";
import type { ApiConfig } from "./config.js";

export type DatabasePool = Pool;

export function createDatabasePool(config: ApiConfig): DatabasePool {
  return new Pool({
    connectionString: config.databaseUrl,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000
  });
}

export async function verifyDatabaseConnection(db: DatabasePool): Promise<void> {
  await db.query("SELECT 1");
}