import * as fs from "fs";
import * as path from "path";
import { z } from "zod";
import { RiskSchema } from "./envelope";

export interface CommandEntry {
  commands: string[];
  risk: "low" | "medium" | "high";
  description?: string;
}

export interface CommandMap {
  version: string;
  aliases: Record<string, CommandEntry>;
}

const CommandEntrySchema = z.object({
  commands: z.array(z.string().min(1)).min(1),
  risk: RiskSchema,
  description: z.string().optional(),
});

const CommandMapSchema = z.object({
  version: z.string(),
  aliases: z.record(z.string(), CommandEntrySchema),
});

export class CommandNotAllowed extends Error {
  constructor(alias: string) {
    super(`CommandNotAllowed: alias "${alias}" is not in the command map`);
    this.name = "CommandNotAllowed";
  }
}

/**
 * Load the command map for the given VS Code version.
 * Selects the map file with the highest version <= vsCodeVersion.
 * Throws if no suitable map exists.
 * @remarks Reads from disk synchronously. Call once at startup and cache the result.
 */
export function loadCommandMap(vsCodeVersion: string, mapsDir: string): CommandMap {
  const files = fs.readdirSync(mapsDir).filter((f) => f.startsWith("command-map.vscode-") && f.endsWith(".json"));

  // Parse versions from filenames
  const entries = files.map((f) => {
    const match = f.match(/command-map\.vscode-(\d+\.\d+)\.json/);
    return match ? { file: f, ver: match[1] } : null;
  }).filter(Boolean) as { file: string; ver: string }[];

  if (entries.length === 0) throw new Error("No command maps found in " + mapsDir);

  // Pick highest version <= vsCodeVersion
  const [reqMaj, reqMin] = vsCodeVersion.split(".").map(Number);

  const candidates = entries
    .filter(({ ver }) => {
      const [maj, min] = ver.split(".").map(Number);
      return maj < reqMaj || (maj === reqMaj && min <= reqMin);
    })
    .sort((a, b) => {
      const [am, an] = a.ver.split(".").map(Number);
      const [bm, bn] = b.ver.split(".").map(Number);
      return bm - am || bn - an; // descending
    });

  if (candidates.length === 0) {
    throw new Error(`No command map available for VS Code ${vsCodeVersion}`);
  }

  const chosen = path.join(mapsDir, candidates[0].file);
  const raw = JSON.parse(fs.readFileSync(chosen, "utf8"));
  return CommandMapSchema.parse(raw) as CommandMap;
}

/**
 * Resolve an alias from a loaded CommandMap.
 * Throws CommandNotAllowed if alias is not in the map.
 */
export function resolveAlias(map: CommandMap, alias: string): CommandEntry {
  const entry = map.aliases[alias];
  if (!entry) throw new CommandNotAllowed(alias);
  return entry;
}
