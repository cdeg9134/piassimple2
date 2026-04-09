import app from "./app";
import { logger } from "./lib/logger";
import { seedDefaultStore } from "./lib/seed";

const port = Number(process.env.PORT ?? "8080");

if (Number.isNaN(port) || port <= 0) {
  logger.error({ port: process.env.PORT }, "Invalid PORT value");
  process.exit(1);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  seedDefaultStore();
});
