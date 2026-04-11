import { z } from "zod";

// ─── Risk ────────────────────────────────────────────────────────────────────
export const RiskSchema = z.enum(["low", "medium", "high"]);
export type Risk = z.infer<typeof RiskSchema>;

// ─── Action base ─────────────────────────────────────────────────────────────
const ActionBaseSchema = z.object({
  id: z.string().min(1),
  risk: RiskSchema,
});

// ─── Action variants ─────────────────────────────────────────────────────────
const ExecuteCommandActionSchema = ActionBaseSchema.extend({
  type: z.literal("execute_command"),
  alias: z.string().min(1),
  args: z.array(z.unknown()).optional(),
}).strict();

const ShowInformationMessageActionSchema = ActionBaseSchema.extend({
  type: z.literal("show_information_message"),
  message: z.string().min(1),
  modal: z.boolean().optional(),
}).strict();

const RevealUriActionSchema = ActionBaseSchema.extend({
  type: z.literal("reveal_uri"),
  uri: z.string().min(1),
}).strict();

const SetEditorSelectionActionSchema = ActionBaseSchema.extend({
  type: z.literal("set_editor_selection"),
  uri: z.string().min(1),
  start: z.object({ line: z.number().int().min(0), character: z.number().int().min(0) }),
  end: z.object({ line: z.number().int().min(0), character: z.number().int().min(0) }),
}).strict();

const RequestUserConfirmActionSchema = ActionBaseSchema.extend({
  type: z.literal("request_user_confirm"),
  title: z.string().min(1),
  details: z.string().optional(),
}).strict();

const NoopActionSchema = ActionBaseSchema.extend({
  type: z.literal("noop"),
  reason: z.string().optional(),
}).strict();

export const ActionSchema = z.discriminatedUnion("type", [
  ExecuteCommandActionSchema,
  ShowInformationMessageActionSchema,
  RevealUriActionSchema,
  SetEditorSelectionActionSchema,
  RequestUserConfirmActionSchema,
  NoopActionSchema,
]);

export type CursorBuddyAction = z.infer<typeof ActionSchema>;

// ─── Envelope ─────────────────────────────────────────────────────────────────
export const AssistantEnvelopeV1Schema = z
  .object({
    schema_version: z.literal("1.0"),
    session_id: z.string().uuid(),
    utterance_id: z.string().uuid(),
    assistant_text: z.string(),
    confidence: z.number().min(0).max(1),
    actions: z.array(ActionSchema).min(1),
    telemetry_note: z.string().optional(),
  })
  .strict()
  .superRefine((env, ctx) => {
    // Reject duplicate action IDs
    const ids = env.actions.map((a) => a.id);
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate action id: ${id}`,
          path: ["actions"],
        });
        return;
      }
      seen.add(id);
    }
  });

export type AssistantEnvelopeV1 = z.infer<typeof AssistantEnvelopeV1Schema>;
