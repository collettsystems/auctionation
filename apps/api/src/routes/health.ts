import type { FastifyInstance } from "fastify";
import { verifyDatabaseConnection } from "../db.js";

export async function registerHealthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health", async (_request, reply) => {
    try {
      await verifyDatabaseConnection(app.db);

      return {
        data: {
          service: "auctionation-api",
          status: "ok",
          database: "ok",
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      app.log.error({ error }, "Database health check failed.");

      return reply.code(503).send({
        data: {
          service: "auctionation-api",
          status: "degraded",
          database: "unavailable",
          timestamp: new Date().toISOString()
        }
      });
    }
  });
}