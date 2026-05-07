import type { ApiConfig } from "../config.js";

declare module "fastify" {
  interface FastifyInstance {
    config: ApiConfig;
  }
}