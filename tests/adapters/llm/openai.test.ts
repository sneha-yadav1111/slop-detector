import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }))

vi.mock('openai', () => {
  class MockOpenAI {
    chat = { completions: { create: mockCreate } }
  }
  return { default: MockOpenAI, OpenAI: MockOpenAI }
})

import { OpenAIAdapter } from '../../../src/adapters/llm/openai.js'
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
  mockCreate.mockReset()
})

describe('OpenAIAdapter.adjudicate', () => {
  it('Test 1: happy path returns parsed verdict', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: '{"score":7,"rationale":"ok","missing":["x"]}' } }],
    })
    const a = new OpenAIAdapter('sk-test', 'gpt-4o-mini')
    expect(await a.adjudicate(REQ)).toEqual({ score: 7, rationale: 'ok', missing: ['x'] })
  })

  it('Test 2: zod parse failure (score=99) throws "zod parse failed"', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: '{"score":99,"rationale":"ok","missing":[]}' } }],
    })
    const a = new OpenAIAdapter('sk-test', 'gpt-4o-mini')
    await expect(a.adjudicate(REQ)).rejects.toThrow('zod parse failed')
  })

  it('Test 3a: null content throws "No content in response"', async () => {
    mockCreate.mockResolvedValue({ choices: [{ message: { content: null } }] })
    const a = new OpenAIAdapter('sk-test', 'gpt-4o-mini')
    await expect(a.adjudicate(REQ)).rejects.toThrow('No content in response')
  })

  it('Test 3b: empty choices throws "No content in response"', async () => {
    mockCreate.mockResolvedValue({ choices: [] })
    const a = new OpenAIAdapter('sk-test', 'gpt-4o-mini')
    await expect(a.adjudicate(REQ)).rejects.toThrow('No content in response')
  })

  it('Test 4: SDK network error is propagated unchanged', async () => {
    const sdkErr = Object.assign(new Error('rate limited'), { status: 429 })
    mockCreate.mockRejectedValue(sdkErr)
    const a = new OpenAIAdapter('sk-test', 'gpt-4o-mini')
    await expect(a.adjudicate(REQ)).rejects.toBe(sdkErr)
  })

  it('Tests 5-9: call shape (temp/tokens/system/strict json_schema/model)', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: '{"score":5,"rationale":"o","missing":[]}' } }],
    })
    const a = new OpenAIAdapter('sk-test', 'gpt-4o-mini')
    await a.adjudicate(REQ)
    const args = mockCreate.mock.calls[0]?.[0] as Record<string, unknown>
    expect(args.temperature).toBe(0) // Test 5
    expect(args.max_completion_tokens).toBe(400) // Test 6
    const messages = args.messages as Array<{ role: string; content: string }>
    expect(messages[0]).toEqual({ role: 'system', content: SYSTEM_PROMPT_ADJUDICATOR }) // Test 7
    const rf = args.response_format as {
      type: string
      json_schema: { name: string; strict: boolean; schema: object }
    }
    expect(rf.type).toBe('json_schema') // Test 8a
    expect(rf.json_schema.strict).toBe(true) // Test 8b
    expect(rf.json_schema.schema).toBe(VERDICT_JSON_SCHEMA) // Test 8c
    expect(rf.json_schema.name).toBe('verdict') // Test 8d
    expect(args.model).toBe('gpt-4o-mini') // Test 9
  })

  it('Test 10 (Pitfall 4): adapter-constructed error messages never contain sk-/Bearer/Authorization', async () => {
    const a = new OpenAIAdapter('sk-secret123', 'gpt-4o-mini')
    mockCreate.mockResolvedValueOnce({ choices: [{ message: { content: 'not json' } }] })
    await expect(a.adjudicate(REQ)).rejects.toMatchObject({
      message: expect.not.stringMatching(/sk-|Bearer|Authorization/i),
    })
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: '{"score":99,"rationale":"r","missing":[]}' } }],
    })
    await expect(a.adjudicate(REQ)).rejects.toMatchObject({
      message: expect.not.stringMatching(/sk-|Bearer|Authorization/i),
    })
    mockCreate.mockResolvedValueOnce({ choices: [{ message: { content: null } }] })
    await expect(a.adjudicate(REQ)).rejects.toMatchObject({
      message: expect.not.stringMatching(/sk-|Bearer|Authorization/i),
    })
  })
})

describe('OpenAIAdapter.extractChecklistFromContributing', () => {
  const TIER3_REQ = {
    contributingMd: '# How to file\nShare your version.',
    issueType: 'bug' as const,
  }

  it('Test 11: happy path returns ChecklistItem[] with signalKey propagated', async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: '{"items":[{"text":"Share version","signalKey":"hasVersionMention"}]}',
          },
        },
      ],
    })
    const a = new OpenAIAdapter('sk-test', 'gpt-4o-mini')
    expect(await a.extractChecklistFromContributing(TIER3_REQ)).toEqual([
      { text: 'Share version', signalKey: 'hasVersionMention' },
    ])
  })

  it('Test 11b: null signalKey is dropped (becomes optional on ChecklistItem)', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: '{"items":[{"text":"Repro steps","signalKey":null}]}' } }],
    })
    const a = new OpenAIAdapter('sk-test', 'gpt-4o-mini')
    expect(await a.extractChecklistFromContributing(TIER3_REQ)).toEqual([{ text: 'Repro steps' }])
  })

  it('Test 13: Tier-3 call uses SYSTEM_PROMPT_TIER3 + TIER3_JSON_SCHEMA + name=tier3-checklist + strict', async () => {
    mockCreate.mockResolvedValue({ choices: [{ message: { content: '{"items":[]}' } }] })
    const a = new OpenAIAdapter('sk-test', 'gpt-4o-mini')
    await a.extractChecklistFromContributing(TIER3_REQ)
    const args = mockCreate.mock.calls[0]?.[0] as Record<string, unknown>
    const messages = args.messages as Array<{ role: string; content: string }>
    expect(messages[0].content).toBe(SYSTEM_PROMPT_TIER3)
    const rf = args.response_format as {
      json_schema: { name: string; strict: boolean; schema: object }
    }
    expect(rf.json_schema.name).toBe('tier3-checklist')
    expect(rf.json_schema.schema).toBe(TIER3_JSON_SCHEMA)
    expect(rf.json_schema.strict).toBe(true)
  })
})

describe('Pitfall 3 — zod 4 strict-mode JSON Schema compatibility', () => {
  it('Test 12: TIER3 schema lists signalKey AND text in required (nullable not optional)', () => {
    const itemSchema = (
      TIER3_JSON_SCHEMA as unknown as {
        properties: { items: { items: { required: string[]; additionalProperties: boolean } } }
      }
    ).properties.items.items
    expect(itemSchema.required).toContain('signalKey')
    expect(itemSchema.required).toContain('text')
    expect(itemSchema.additionalProperties).toBe(false)
  })
})
