import { loadConfig } from "./config";
import { createOpenClawServer } from "./server";

function main(): void {
  const config = loadConfig();
  const wss = createOpenClawServer(config);
  process.stdout.write(`[openclaw] listening on ws://localhost:${config.OPENCLAW_LISTEN_PORT}\n`);

  const shutdown = () => {
    wss.close(() => process.exit(0));
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main();
