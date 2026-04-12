import { AssistantEnvelopeV1, AssistantEnvelopeV1Schema } from "@cursorbuddy/shared";
import { randomUUID } from "crypto";

interface BuildEnvelopeInput {
  sessionId: string;
  assistantText: string;
  actionAlias?: "open_scm" | "open_palette" | "focus_terminal";
  requireConfirm?: boolean;
}

function chooseSafeAlias(text: string): BuildEnvelopeInput["actionAlias"] {
  const lc = text.toLowerCase();
  if (lc.includes("source control") || lc.includes("commit") || lc.includes("git")) {
    return "open_scm";
  }
  if (lc.includes("terminal")) {
    return "focus_terminal";
  }
  if (lc.includes("command palette") || lc.includes("command")) {
    return "open_palette";
  }
  return undefined;
}

export function buildEnvelope(input: BuildEnvelopeInput): AssistantEnvelopeV1 {
  const alias = input.actionAlias ?? chooseSafeAlias(input.assistantText);
  const confirmNeeded = input.requireConfirm === true;
  const envelope = {
    schema_version: "1.0",
    session_id: input.sessionId,
    utterance_id: randomUUID(),
    assistant_text: input.assistantText,
    confidence: 0.85,
    actions: confirmNeeded
      ? [
          { type: "request_user_confirm", id: randomUUID(), risk: "high", title: "Confirm requested action", details: input.assistantText },
          { type: "execute_command", id: randomUUID(), risk: "high", alias: "open_scm" },
        ]
      : alias
      ? [{ type: "execute_command", id: randomUUID(), risk: "low", alias }]
      : [{ type: "show_information_message", id: randomUUID(), risk: "low", message: input.assistantText }],
  };
  return AssistantEnvelopeV1Schema.parse(envelope);
}
