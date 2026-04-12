import { z } from "zod";
import { AssistantEnvelopeV1Schema } from "./envelope";

export const SessionStartFrameSchema = z
  .object({
    type: z.literal("session_start"),
    session_id: z.string().uuid(),
    workflow: z.string().min(1),
    locale: z.string().optional(),
  })
  .strict();

export const AudioChunkFrameSchema = z
  .object({
    type: z.literal("audio_chunk"),
    data: z.string().min(1),
    encoding: z.literal("pcm16"),
    sample_rate: z.number().int().positive(),
  })
  .strict();

export const AudioEndFrameSchema = z
  .object({
    type: z.literal("audio_end"),
  })
  .strict();

export const ToolResultFrameSchema = z
  .object({
    type: z.literal("tool_result"),
    call_id: z.string().min(1),
    output: z.unknown(),
  })
  .strict();

export const ClientFrameSchema = z.discriminatedUnion("type", [
  SessionStartFrameSchema,
  AudioChunkFrameSchema,
  AudioEndFrameSchema,
  ToolResultFrameSchema,
]);

export const ToolCallServerFrameSchema = z
  .object({
    type: z.literal("tool_call"),
    call_id: z.string().min(1),
    name: z.literal("vscode_probe_state"),
    input: z
      .object({
        include_git: z.boolean().optional(),
        include_active_editor: z.boolean().optional(),
        include_file_body: z.boolean().optional(),
      })
      .strict(),
  })
  .strict();

export const AudioOutputChunkServerFrameSchema = z
  .object({
    type: z.literal("audio_output_chunk"),
    data: z.string().min(1),
    encoding: z.literal("pcm16"),
    sample_rate: z.number().int().positive(),
  })
  .strict();

export const AudioOutputDoneServerFrameSchema = z
  .object({
    type: z.literal("audio_output_done"),
  })
  .strict();

export const ServerFrameSchema = z.union([
  AssistantEnvelopeV1Schema,
  ToolCallServerFrameSchema,
  AudioOutputChunkServerFrameSchema,
  AudioOutputDoneServerFrameSchema,
]);

export type ClientFrame = z.infer<typeof ClientFrameSchema>;
export type ServerFrame = z.infer<typeof ServerFrameSchema>;
