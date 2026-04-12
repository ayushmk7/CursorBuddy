import { describe, expect, it } from "vitest";
import { randomUUID } from "crypto";
import { buildEnvelope } from "../envelopeBuilder";

describe("openclaw server integration helpers", () => {
  it("builds valid envelope for non-tool completion", () => {
    const env = buildEnvelope({
      sessionId: randomUUID(),
      assistantText: "Open Source Control.",
    });
    expect(env.schema_version).toBe("1.0");
    expect(env.actions.length).toBeGreaterThan(0);
  });
});
