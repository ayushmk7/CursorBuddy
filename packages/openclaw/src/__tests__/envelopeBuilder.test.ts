import { describe, expect, it } from "vitest";
import { buildEnvelope } from "../envelopeBuilder";

describe("buildEnvelope", () => {
  it("maps git/source control text to open_scm", () => {
    const env = buildEnvelope({
      sessionId: "00000000-0000-0000-0000-000000000001",
      assistantText: "Open Source Control so you can commit.",
    });
    expect(env.actions[0].type).toBe("execute_command");
    if (env.actions[0].type === "execute_command") {
      expect(env.actions[0].alias).toBe("open_scm");
    }
  });

  it("maps terminal text to focus_terminal", () => {
    const env = buildEnvelope({
      sessionId: "00000000-0000-0000-0000-000000000001",
      assistantText: "Focus the terminal now.",
    });
    expect(env.actions[0].type).toBe("execute_command");
    if (env.actions[0].type === "execute_command") {
      expect(env.actions[0].alias).toBe("focus_terminal");
    }
  });

  it("falls back to informational action when no command intent", () => {
    const env = buildEnvelope({
      sessionId: "00000000-0000-0000-0000-000000000001",
      assistantText: "Your workspace is healthy.",
    });
    expect(env.actions[0].type).toBe("show_information_message");
  });
});
