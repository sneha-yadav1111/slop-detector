// src/core/llm/schema.ts
// LLM-04 + CHECK-05: zod 4 schemas for LLM structured outputs.
// CRITICAL: This file MUST NOT import from @octokit, @actions, fs, https, or any LLM SDK.
// The same schema is used to (a) generate JSON-Schema sent to the provider, and
// (b) safeParse() the response. Double-bind eliminates LLM-shape drift.

import { z } from 'zod'

// LLM-04: adjudicator output shape.
export const VerdictSchema = z
  .object({
    score: z.number().int().min(0).max(10),
    rationale: z.string().min(1).max(500),
    missing: z.array(z.string().min(1).max(120)).max(5),
  })
  .strict() // Zod 4 default: additionalProperties: false

export const VERDICT_JSON_SCHEMA = z.toJSONSchema(VerdictSchema)

// CHECK-05: Tier-3 CONTRIBUTING.md extraction output shape.
// Pitfall 3 (RESEARCH §279-285): signalKey is NULLABLE not OPTIONAL — OpenAI strict
// mode requires every property to be in `required`. z.optional() would silently break.
export const Tier3ItemSchema = z
  .object({
    text: z.string().min(1).max(120),
    signalKey: z
      .enum([
        'hasCodeBlock',
        'hasStackTrace',
        'hasVersionMention',
        'hasReproKeywords',
        'hasExpectedActual',
        'hasMinimalExample',
        'hasImageOnly',
      ])
      .nullable(),
  })
  .strict()

export const Tier3OutputSchema = z
  .object({
    items: z.array(Tier3ItemSchema).max(5),
  })
  .strict()

export const TIER3_JSON_SCHEMA = z.toJSONSchema(Tier3OutputSchema)

export type Verdict = z.infer<typeof VerdictSchema>
export type Tier3Output = z.infer<typeof Tier3OutputSchema>
