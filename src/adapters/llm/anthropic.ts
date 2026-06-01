// src/adapters/llm/anthropic.ts
// LLM-01: primary adapter (BYOK via ANTHROPIC_API_KEY). Implements LLMPort.
// LLM-03: boundary-delimited prompt via SYSTEM_PROMPT_ADJUDICATOR + buildAdjudicatorUserBlock.
// LLM-04: native structured outputs via output_config.format -> double-bind with zod.
// LLM-06: temperature=0; max_tokens=400; no body/header logging on errors.
// Pitfall 1: DO NOT add cache_control - incompatible with output_config.format.
// Pitfall 4: errors propagate to caller (adjudicate.ts) which logs only status + sliced message.

import { Anthropic } from '@anthropic-ai/sdk'
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

// Loose runtime type for messages.create that survives SDK type drift on output_config.
type AnthropicMessagesCreate = (params: Record<string, unknown>) => Promise<{
  content: Array<{ type: string; text?: string }>
}>

export class AnthropicAdapter implements LLMPort {
  private client: Anthropic
  private modelId: string

  constructor(apiKey: string, modelId: string) {
    this.client = new Anthropic({ apiKey })
    this.modelId = modelId
    // Note: core.setSecret(apiKey) is called by main.ts (Plan 04-08) at process startup.
    // The adapter never logs the apiKey (Pitfall 4).
  }

  private async callJsonSchema<T>(params: {
    system: string
    user: string
    schema: object
    zodSafeParse: (raw: unknown) => { success: true; data: T } | { success: false; error?: unknown }
  }): Promise<T> {
    const create = this.client.messages.create.bind(
      this.client.messages,
    ) as unknown as AnthropicMessagesCreate
    const response = await create({
      model: this.modelId,
      max_tokens: 400,
      temperature: 0,
      system: params.system,
      messages: [{ role: 'user', content: params.user }],
      output_config: { format: { type: 'json_schema', schema: params.schema } },
    })
    const textBlock = response.content.find((b) => b.type === 'text')
    if (!textBlock || typeof textBlock.text !== 'string') {
      throw new Error('No text block in response')
    }
    let raw: unknown
    try {
      raw = JSON.parse(textBlock.text)
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
      schema: TIER3_JSON_SCHEMA,
      zodSafeParse: (r) => Tier3OutputSchema.safeParse(r),
    })
    return out.items.map((i) =>
      i.signalKey ? { text: i.text, signalKey: i.signalKey } : { text: i.text },
    )
  }
}
