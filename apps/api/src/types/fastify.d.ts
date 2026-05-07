import type { ApiConfig } from "../config.js";
import type { DatabasePool } from "../db.js";

declare module "fastify" {
  interface FastifyInstance {
    config: ApiConfig;
    db: DatabasePool;
  }
}