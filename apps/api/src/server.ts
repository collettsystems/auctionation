import cors from "@fastify/cors";
import Fastify from "fastify";
import { loadConfig } from "./config.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerPublicAuctionRoutes } from "./routes/public-auctions.js";

export async function buildServer() {
  const config = loadConfig();
  const app = Fastify({
    logger: true,
    genReqId: () => crypto.randomUUID()
  });

  await app.register(cors, {
    origin: true,
    credentials: true
  });

  app.decorate("config", config);
  await registerHealthRoutes(app);
  await registerPublicAuctionRoutes(app);

  return { app, config };
}

const { app, config } = await buildServer();

try {
  await app.listen({ host: config.host, port: config.port });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}