import cors from "@fastify/cors";
import Fastify from "fastify";
import { randomUUID } from "node:crypto";
import { loadConfig } from "./config.js";
import { createDatabasePool } from "./db.js";
import { registerAdminRoutes } from "./routes/admin.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerPublicAuctionRoutes } from "./routes/public-auctions.js";

export async function buildServer() {
  const config = loadConfig();
  const db = createDatabasePool(config);
  const app = Fastify({
    logger: true,
    genReqId: () => randomUUID()
  });

  await app.register(cors, {
    origin: config.corsOrigins,
    credentials: true
  });

  app.decorate("config", config);
  app.decorate("db", db);
  app.addHook("onClose", async () => {
    await db.end();
  });

  await registerHealthRoutes(app);
  await registerAdminRoutes(app);
  await registerPublicAuctionRoutes(app);

  return { app, config };
}
