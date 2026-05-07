import { buildServer } from "./app.js";

const { app, config } = await buildServer();

async function closeGracefully(signal: NodeJS.Signals): Promise<void> {
  app.log.info({ signal }, "Shutting down Auctionation API.");
  await app.close();
}

process.once("SIGINT", (signal) => {
  void closeGracefully(signal);
});

process.once("SIGTERM", (signal) => {
  void closeGracefully(signal);
});

try {
  await app.listen({ host: config.host, port: config.port });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
