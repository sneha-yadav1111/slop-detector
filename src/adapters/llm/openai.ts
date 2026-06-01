// src/adapters/llm/openai.ts
// LLM-01: secondary adapter (BYOK via OPENAI_API_KEY). Implements LLMPort.
// Mirror of AnthropicAdapter — same prompts, same schemas, same hardening.
// LLM-04: response_format: { type: 'json_schema', json_schema: { ..., strict: true } }.
// LLM-06: temperature=0; max_completion_tokens=400; no body/header logging on errors.
// Pitfall 3: OpenAI strict mode requires every property in `required` — our schemas use
//   z.nullable() not z.optional() so the generated JSON Schema is strict-compatible.
// Pitfall 4: errors propagate to caller (adjudicate.ts); no console.* in this file.
// Open Question 3 fallback (RESEARCH §954-955): if real provider rejects strict-mode for
//   schema reasons, switch to { type: 'json_object' } + zod.safeParse — lose strict
//   guarantee but keep JSON guarantee. Not active code; surface in 04-04-SUMMARY if hit.

import { OpenAI } from 'openai'
import type {
  LLMPort,
  LLMRequest,
  LLMVerdict,
  PrLLMRequest,
  Tier3ExtractRequest,
} from '../../core/llm/port.js'
import {
  TIER3_JSON_SCHEMA,
  Tier3OutputSchema,
  VERDICT_JSON_SCHEMA,
  VerdictSchema,
} from '../../core/llm/schema.js'
import type { ChecklistItem } from '../../core/types.js'
import {
  buildAdjudicatorUserBlock,
  buildPrAdjudicatorUserBlock,
  buildTier3UserBlock,
  SYSTEM_PROMPT_ADJUDICATOR,
  SYSTEM_PROMPT_PR_ADJUDICATOR,
  SYSTEM_PROMPT_TIER3,
} from './prompts.js'

type ChatCompletionsCreate = (params: Record<string, unknown>) => Promise<{
  choices: Array<{ message?: { content?: string | null } }>
}>

export interface OpenAIAdapterOptions {
  /** Override the API base URL — enables OpenAI-compatible providers (OpenRouter, Gemini). */
  baseURL?: string
  /**
   * Use the looser `response_format: { type: 'json_object' }` instead of strict
   * `json_schema`. OpenRouter and Gemini's OpenAI-compatible endpoints don't reliably
   * support strict json_schema, so we fall back to json_object + zod validation.
   */
  jsonObjectMode?: boolean
  /** Optional extra headers (e.g. OpenRouter attribution headers). */
  defaultHeaders?: Record<string, string>
}

export class OpenAIAdapter implements LLMPort {
  private client: OpenAI
  private modelId: string
  private jsonObjectMode: boolean

  constructor(apiKey: string, modelId: string, options: OpenAIAdapterOptions = {}) {
    this.client = new OpenAI({
      apiKey,
      ...(options.baseURL ? { baseURL: options.baseURL } : {}),
      ...(options.defaultHeaders ? { defaultHeaders: options.defaultHeaders } : {}),
    })
    this.modelId = modelId
    this.jsonObjectMode = options.jsonObjectMode ?? false
    // core.setSecret(apiKey) at process startup is the caller's responsibility (main.ts, Plan 04-08).
  }

  private async callJsonSchema<T>(params: {
    system: string
    user: string
    schemaName: string
    schema: object
    zodSafeParse: (raw: unknown) => { success: true; data: T } | { success: false; error?: unknown }
  }): Promise<T> {
    const create = this.client.chat.completions.create.bind(
      this.client.chat.completions,
    ) as unknown as ChatCompletionsCreate
    // OpenRouter / Gemini compatibility: json_object mode needs the schema described in the
    // prompt (the model can't read the response_format schema), so we append it to the system.
    const system = this.jsonObjectMode
      ? `${params.system}\n\nRespond with a single JSON object matching this JSON Schema (no prose, no markdown fences):\n${JSON.stringify(params.schema)}`
      : params.system
    const response = await create({
      model: this.modelId,
      max_completion_tokens: 400,
      temperature: 0,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: params.user },
      ],
      response_format: this.jsonObjectMode
        ? { type: 'json_object' }
        : {
            type: 'json_schema',
            json_schema: { name: params.schemaName, strict: true, schema: params.schema },
          },
    })
    const text = response.choices[0]?.message?.content
    if (!text) throw new Error('No content in response')
    // Some OpenAI-compatible providers wrap JSON in ```json fences even in json_object mode.
    const cleaned = text
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
    let raw: unknown
    try {
      raw = JSON.parse(cleaned)
    } catch {
      throw new Error('Response was not valid JSON')
    }
    const parsed = params.zodSafeParse(raw)
    if (!parsed.success) throw new Error('zod parse failed')
    return parsed.data
  }

  async adjudicate(req: LLMRequest): Promise<LLMVerdict> {
    const user = buildAdjudicatorUserBlock(req.issue, req.signals, req.repoContext)
    return this.callJsonSchema<LLMVerdict>({
      system: SYSTEM_PROMPT_ADJUDICATOR,
      user,
      schemaName: 'verdict',
      schema: VERDICT_JSON_SCHEMA,
      zodSafeParse: (r) => VerdictSchema.safeParse(r),
    })
  }

  async adjudicatePr(req: PrLLMRequest): Promise<LLMVerdict> {
    const user = buildPrAdjudicatorUserBlock(
      req.pr.title,
      req.pr.body,
      req.signals as unknown as Record<string, boolean>,
      req.findings,
      req.maxBodyBytes,
    )
    return this.callJsonSchema<LLMVerdict>({
      system: SYSTEM_PROMPT_PR_ADJUDICATOR,
      user,
      schemaName: 'pr-verdict',
      schema: VERDICT_JSON_SCHEMA,
      zodSafeParse: (r) => VerdictSchema.safeParse(r),
    })
  }

  async extractChecklistFromContributing(req: Tier3ExtractRequest): Promise<ChecklistItem[]> {
    const user = buildTier3UserBlock(req.contributingMd, req.issueType)
    const out = await this.callJsonSchema<{
      items: Array<{ text: string; signalKey: ChecklistItem['signalKey'] | null }>
    }>({
      system: SYSTEM_PROMPT_TIER3,
      user,
      schemaName: 'tier3-checklist',
      schema: TIER3_JSON_SCHEMA,
      zodSafeParse: (r) => Tier3OutputSchema.safeParse(r),
    })
    return out.items.map((i) =>
      i.signalKey ? { text: i.text, signalKey: i.signalKey } : { text: i.text },
    )
  }
}
