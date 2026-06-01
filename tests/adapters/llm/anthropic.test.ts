import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockMessagesCreate } = vi.hoisted(() => ({ mockMessagesCreate: vi.fn() }))

vi.mock('@anthropic-ai/sdk', () => {
  class MockAnthropic {
    messages = { create: mockMessagesCreate }
  }
  return { default: MockAnthropic, Anthropic: MockAnthropic }
})

import { AnthropicAdapter } from '../../../src/adapters/llm/anthropic.js'
import {
  SYSTEM_PROMPT_ADJUDICATOR,
  SYSTEM_PROMPT_TIER3,
} from '../../../src/adapters/llm/prompts.js'
import { TIER3_JSON_SCHEMA, VERDICT_JSON_SCHEMA } from '../../../src/core/llm/schema.js'
import type { Issue, RepoContext, Signals } from '../../../src/core/types.js'

const ISSUE: Issue = { title: 't', body: 'b', labels: [] }
const SIGNALS: Signals = {
  hasCodeBlock: false,
  hasStackTrace: false,
  hasVersionMention: false,
  hasReproKeywords: false,
  hasExpectedActual: false,
  hasMinimalExample: false,
  hasImageOnly: false,
}
const CTX: RepoContext = {
  hasIssueForms: false,
  hasMdTemplates: false,
  hasContributing: false,
  templates: [],
}

const REQ = { issue: ISSUE, signals: SIGNALS, repoContext: CTX }

beforeEach(() => {
  mockMessagesCreate.mockReset()
})

describe('AnthropicAdapter.adjudicate', () => {
  it('Test 1: happy path returns parsed verdict', async () => {
    mockMessagesCreate.mockResolvedValue({
      content: [{ type: 'text', text: '{"score":7,"rationale":"ok","missing":["x"]}' }],
    })
    const a = new AnthropicAdapter('sk-test', 'claude-haiku-4-5')
    expect(await a.adjudicate(REQ)).toEqual({ score: 7, rationale: 'ok', missing: ['x'] })
  })

  it('Test 2: zod parse failure (score=99 out of range) throws "zod parse failed"', async () => {
    mockMessagesCreate.mockResolvedValue({
      content: [{ type: 'text', text: '{"score":99,"rationale":"ok","missing":[]}' }],
    })
    const a = new AnthropicAdapter('sk-test', 'claude-haiku-4-5')
    await expect(a.adjudicate(REQ)).rejects.toThrow('zod parse failed')
  })

  it('Test 3: no text block in response throws "No text block in response"', async () => {
    mockMessagesCreate.mockResolvedValue({
      content: [{ type: 'tool_use', name: 'irrelevant' }],
    })
    const a = new AnthropicAdapter('sk-test', 'claude-haiku-4-5')
    await expect(a.adjudicate(REQ)).rejects.toThrow('No text block in response')
  })

  it('Test 4: SDK network error (status 429) is propagated unchanged', async () => {
    const sdkErr = Object.assign(new Error('rate limited'), { status: 429 })
    mockMessagesCreate.mockRejectedValue(sdkErr)
    const a = new AnthropicAdapter('sk-test', 'claude-haiku-4-5')
    await expect(a.adjudicate(REQ)).rejects.toBe(sdkErr)
  })

  it('Test 5: call sets temperature: 0', async () => {
    mockMessagesCreate.mockResolvedValue({
      content: [{ type: 'text', text: '{"score":5,"rationale":"r","missing":[]}' }],
    })
    const a = new AnthropicAdapter('sk-test', 'claude-haiku-4-5')
    await a.adjudicate(REQ)
    expect(mockMessagesCreate).toHaveBeenCalledWith(
      expect.objectContaining({ temperature: 0 }),
    )
  })

  it('Test 6: call sets max_tokens: 400', async () => {
    mockMessagesCreate.mockResolvedValue({
      content: [{ type: 'text', text: '{"score":5,"rationale":"r","missing":[]}' }],
    })
    const a = new AnthropicAdapter('sk-test', 'claude-haiku-4-5')
    await a.adjudicate(REQ)
    expect(mockMessagesCreate).toHaveBeenCalledWith(
      expect.objectContaining({ max_tokens: 400 }),
    )
  })

  it('Test 7: call uses SYSTEM_PROMPT_ADJUDICATOR as system', async () => {
    mockMessagesCreate.mockResolvedValue({
      content: [{ type: 'text', text: '{"score":5,"rationale":"r","missing":[]}' }],
    })
    const a = new AnthropicAdapter('sk-test', 'claude-haiku-4-5')
    await a.adjudicate(REQ)
    expect(mockMessagesCreate).toHaveBeenCalledWith(
      expect.objectContaining({ system: SYSTEM_PROMPT_ADJUDICATOR }),
    )
  })

  it('Test 8: call passes VERDICT_JSON_SCHEMA via output_config.format', async () => {
    mockMessagesCreate.mockResolvedValue({
      content: [{ type: 'text', text: '{"score":5,"rationale":"r","missing":[]}' }],
    })
    const a = new AnthropicAdapter('sk-test', 'claude-haiku-4-5')
    await a.adjudicate(REQ)
    const args = mockMessagesCreate.mock.calls[0]?.[0] as Record<string, unknown>
    const oc = args.output_config as { format: { type: string; schema: object } }
    expect(oc.format.type).toBe('json_schema')
    expect(oc.format.schema).toBe(VERDICT_JSON_SCHEMA)
  })

  it('Test 9: call uses configured modelId', async () => {
    mockMessagesCreate.mockResolvedValue({
      content: [{ type: 'text', text: '{"score":5,"rationale":"r","missing":[]}' }],
    })
    const a = new AnthropicAdapter('sk-test', 'claude-haiku-4-5')
    await a.adjudicate(REQ)
    expect(mockMessagesCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'claude-haiku-4-5' }),
    )
  })

  it('Test 10 (Pitfall 4): adapter-constructed error messages never contain sk-/Bearer/Authorization', async () => {
    const a = new AnthropicAdapter('sk-secret123', 'claude-haiku-4-5')
    // Force each adapter-constructed error path and inspect the message.
    mockMessagesCreate.mockResolvedValueOnce({ content: [{ type: 'text', text: 'not json' }] })
    await expect(a.adjudicate(REQ)).rejects.toMatchObject({
      message: expect.not.stringMatching(/sk-|Bearer|Authorization/i),
    })
    mockMessagesCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: '{"score":99,"rationale":"r","missing":[]}' }],
    })
    await expect(a.adjudicate(REQ)).rejects.toMatchObject({
      message: expect.not.stringMatching(/sk-|Bearer|Authorization/i),
    })
    mockMessagesCreate.mockResolvedValueOnce({ content: [{ type: 'tool_use' }] })
    await expect(a.adjudicate(REQ)).rejects.toMatchObject({
      message: expect.not.stringMatching(/sk-|Bearer|Authorization/i),
    })
  })

  it('Test 14 (Pitfall 1): call args do NOT contain cache_control', async () => {
    mockMessagesCreate.mockResolvedValue({
      content: [{ type: 'text', text: '{"score":5,"rationale":"r","missing":[]}' }],
    })
    const a = new AnthropicAdapter('sk-test', 'claude-haiku-4-5')
    await a.adjudicate(REQ)
    const args = mockMessagesCreate.mock.calls[0]?.[0]
    expect(JSON.stringify(args)).not.toMatch(/cache_control/i)
  })
})

describe('AnthropicAdapter.extractChecklistFromContributing', () => {
  const TIER3_REQ = { contributingMd: '# How to file\nShare your version.', issueType: 'bug' as const }

  it('Test 11: happy path returns ChecklistItem[] with signalKey carried through', async () => {
    mockMessagesCreate.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: '{"items":[{"text":"Share version","signalKey":"hasVersionMention"}]}',
        },
      ],
    })
    const a = new AnthropicAdapter('sk-test', 'claude-haiku-4-5')
    expect(await a.extractChecklistFromContributing(TIER3_REQ)).toEqual([
      { text: 'Share version', signalKey: 'hasVersionMention' },
    ])
  })

  it('Test 11b: null signalKey is dropped (becomes optional)', async () => {
    mockMessagesCreate.mockResolvedValue({
      content: [
        { type: 'text', text: '{"items":[{"text":"Repro steps","signalKey":null}]}' },
      ],
    })
    const a = new AnthropicAdapter('sk-test', 'claude-haiku-4-5')
    expect(await a.extractChecklistFromContributing(TIER3_REQ)).toEqual([
      { text: 'Repro steps' },
    ])
  })

  it('Test 12: more than 5 items -> Tier3OutputSchema rejects -> "zod parse failed"', async () => {
    const items = Array.from({ length: 6 }, (_, i) => ({ text: `item ${i}`, signalKey: null }))
    mockMessagesCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify({ items }) }],
    })
    const a = new AnthropicAdapter('sk-test', 'claude-haiku-4-5')
    await expect(a.extractChecklistFromContributing(TIER3_REQ)).rejects.toThrow('zod parse failed')
  })

  it('Test 13: Tier-3 call uses SYSTEM_PROMPT_TIER3 + TIER3_JSON_SCHEMA', async () => {
    mockMessagesCreate.mockResolvedValue({
      content: [{ type: 'text', text: '{"items":[]}' }],
    })
    const a = new AnthropicAdapter('sk-test', 'claude-haiku-4-5')
    await a.extractChecklistFromContributing(TIER3_REQ)
    const args = mockMessagesCreate.mock.calls[0]?.[0] as Record<string, unknown>
    expect(args.system).toBe(SYSTEM_PROMPT_TIER3)
    const oc = args.output_config as { format: { schema: object } }
    expect(oc.format.schema).toBe(TIER3_JSON_SCHEMA)
  })
})
