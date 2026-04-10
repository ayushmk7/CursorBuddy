import { describe, it, expect } from "vitest";
import {
  AssistantEnvelopeV1Schema,
  type AssistantEnvelopeV1,
} from "../envelope";

const VALID_ENVELOPE: AssistantEnvelopeV1 = {
  schema_version: "1.0",
  session_id: "11111111-1111-1111-1111-111111111111",
  utterance_id: "22222222-2222-2222-2222-222222222222",
  assistant_text: "Opening the Source Control view.",
  confidence: 0.86,
  actions: [
    {
      id: "a1",
      type: "execute_command",
      risk: "low",
      alias: "open_scm",
      args: [],
    },
  ],
};

describe("AssistantEnvelopeV1Schema", () => {
  it("accepts a valid low-risk envelope", () => {
    const result = AssistantEnvelopeV1Schema.safeParse(VALID_ENVELOPE);
    expect(result.success).toBe(true);
  });

  it("accepts a high-risk envelope with confirm action", () => {
    const env: AssistantEnvelopeV1 = {
      ...VALID_ENVELOPE,
      utterance_id: "33333333-3333-3333-3333-333333333333",
      actions: [
        {
          id: "a1",
          type: "request_user_confirm",
          risk: "high",
          title: "Stage all changes?",
          details: "Runs git.stageAll.",
        },
        {
          id: "a2",
          type: "execute_command",
          risk: "high",
          alias: "git_stage_all",
          args: [],
        },
      ],
    };
    const result = AssistantEnvelopeV1Schema.safeParse(env);
    expect(result.success).toBe(true);
  });

  it("rejects schema_version !== '1.0'", () => {
    const bad = { ...VALID_ENVELOPE, schema_version: "2.0" };
    expect(AssistantEnvelopeV1Schema.safeParse(bad).success).toBe(false);
  });

  it("rejects extra top-level properties", () => {
    const bad = { ...VALID_ENVELOPE, foo: "bar" };
    expect(AssistantEnvelopeV1Schema.safeParse(bad).success).toBe(false);
  });

  it("rejects duplicate action ids", () => {
    const bad: AssistantEnvelopeV1 = {
      ...VALID_ENVELOPE,
      actions: [
        { id: "a1", type: "noop", risk: "low", reason: "test" },
        { id: "a1", type: "noop", risk: "low", reason: "dup" },
      ],
    };
    expect(AssistantEnvelopeV1Schema.safeParse(bad).success).toBe(false);
  });

  it("rejects unknown action type", () => {
    const bad = {
      ...VALID_ENVELOPE,
      actions: [{ id: "a1", type: "rm_rf", risk: "low" }],
    };
    expect(AssistantEnvelopeV1Schema.safeParse(bad).success).toBe(false);
  });

  it("rejects empty actions array", () => {
    const bad = { ...VALID_ENVELOPE, actions: [] };
    expect(AssistantEnvelopeV1Schema.safeParse(bad).success).toBe(false);
  });

  it("rejects missing required fields", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { session_id, ...bad } = VALID_ENVELOPE;
    expect(AssistantEnvelopeV1Schema.safeParse(bad).success).toBe(false);
  });
});
