import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const ConfigSchema = z.object({
  OPENCLAW_LISTEN_PORT: z.coerce.number().int().positive().default(9090),
  OPENCLAW_SERVICE_TOKEN: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_REALTIME_MODEL: z.string().min(1).default("gpt-realtime"),
  OPENCLAW_DEFAULT_VOICE: z.string().min(1).default("marin"),
  OPENCLAW_LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export type OpenClawConfig = z.infer<typeof ConfigSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): OpenClawConfig {
  return ConfigSchema.parse({
    OPENCLAW_LISTEN_PORT: env.OPENCLAW_LISTEN_PORT,
    OPENCLAW_SERVICE_TOKEN: env.OPENCLAW_SERVICE_TOKEN,
    OPENAI_API_KEY: env.OPENAI_API_KEY,
    OPENAI_REALTIME_MODEL: env.OPENAI_REALTIME_MODEL,
    OPENCLAW_DEFAULT_VOICE: env.OPENCLAW_DEFAULT_VOICE,
    OPENCLAW_LOG_LEVEL: env.OPENCLAW_LOG_LEVEL,
  });
}
