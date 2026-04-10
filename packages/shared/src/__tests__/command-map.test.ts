import { describe, it, expect } from "vitest";
import * as path from "path";
import { loadCommandMap, resolveAlias, type CommandEntry } from "../command-map";

const MAPS_DIR = path.resolve(__dirname, "../../maps");

describe("loadCommandMap", () => {
  it("loads vscode-1.98 map without throwing", () => {
    const map = loadCommandMap("1.98.0", MAPS_DIR);
    expect(map).toBeDefined();
    expect(typeof map).toBe("object");
  });

  it("loads vscode-1.99 map without throwing", () => {
    const map = loadCommandMap("1.99.0", MAPS_DIR);
    expect(map).toBeDefined();
  });

  it("falls back to nearest lower version when exact version missing", () => {
    // 1.100.0 doesn't exist, should fall back to 1.99
    const map = loadCommandMap("1.100.0", MAPS_DIR);
    expect(map).toBeDefined();
  });

  it("throws when no maps available at all for very old version", () => {
    expect(() => loadCommandMap("0.1.0", MAPS_DIR)).toThrow();
  });
});

describe("resolveAlias", () => {
  it("resolves open_scm alias to a command entry", () => {
    const map = loadCommandMap("1.99.0", MAPS_DIR);
    const entry: CommandEntry = resolveAlias(map, "open_scm");
    expect(entry).toBeDefined();
    expect(entry.commands).toContain("workbench.view.scm");
    expect(entry.risk).toBe("low");
  });

  it("throws CommandNotAllowed for unknown alias", () => {
    const map = loadCommandMap("1.99.0", MAPS_DIR);
    expect(() => resolveAlias(map, "rm_rf")).toThrow("CommandNotAllowed");
  });
});
