import { app } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./db.js";
import { processDueDateCheckIns } from "./services/safetyCheckIns.js";

const server = app.listen(env.PORT, () => {
  console.log(`Spectrum API listening on http://localhost:${env.PORT}`);
});

void processDueDateCheckIns().catch(() => undefined);
const safetyCheckTimer = setInterval(() => { void processDueDateCheckIns().catch(() => undefined); }, 60_000);
safetyCheckTimer.unref();

const shutdown = async () => {
  clearInterval(safetyCheckTimer);
  server.close();
  await prisma.$disconnect();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
