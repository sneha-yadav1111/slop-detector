import { describe, it, expect } from 'vitest'
import {
  VerdictSchema,
  VERDICT_JSON_SCHEMA,
  Tier3ItemSchema,
  Tier3OutputSchema,
  TIER3_JSON_SCHEMA,
} from '../../../src/core/llm/schema.js'

describe('VerdictSchema', () => {
  it('Test 1: accepts a valid verdict', () => {
    const result = VerdictSchema.safeParse({
      score: 5,
      rationale: 'ok',
      missing: ['x'],
    })
    expect(result.success).toBe(true)
  })

  it('Test 2: rejects score > 10', () => {
    const result = VerdictSchema.safeParse({
      score: 11,
      rationale: 'ok',
      missing: [],
    })
    expect(result.success).toBe(false)
  })

  it('Test 2b: rejects score < 0', () => {
    const result = VerdictSchema.safeParse({
      score: -1,
      rationale: 'ok',
      missing: [],
    })
    expect(result.success).toBe(false)
  })

  it('Test 2c: rejects non-integer score', () => {
    const result = VerdictSchema.safeParse({
      score: 5.5,
      rationale: 'ok',
      missing: [],
    })
    expect(result.success).toBe(false)
  })

  it('Test 3: rejects rationale > 500 chars', () => {
    const result = VerdictSchema.safeParse({
      score: 5,
      rationale: 'a'.repeat(501),
      missing: [],
    })
    expect(result.success).toBe(false)
  })

  it('Test 3b: rejects empty rationale', () => {
    const result = VerdictSchema.safeParse({
      score: 5,
      rationale: '',
      missing: [],
    })
    expect(result.success).toBe(false)
  })

  it('Test 4: rejects missing[] longer than 5 items', () => {
    const result = VerdictSchema.safeParse({
      score: 5,
      rationale: 'ok',
      missing: ['a', 'b', 'c', 'd', 'e', 'f'],
    })
    expect(result.success).toBe(false)
  })

  it('Test 4b: accepts exactly 5 missing items', () => {
    const result = VerdictSchema.safeParse({
      score: 5,
      rationale: 'ok',
      missing: ['a', 'b', 'c', 'd', 'e'],
    })
    expect(result.success).toBe(true)
  })

  it('Test 4c: rejects an item > 120 chars inside missing[]', () => {
    const result = VerdictSchema.safeParse({
      score: 5,
      rationale: 'ok',
      missing: ['a'.repeat(121)],
    })
    expect(result.success).toBe(false)
  })

  it('Test 5: rejects extra unknown properties (strict)', () => {
    const result = VerdictSchema.safeParse({
      score: 5,
      rationale: 'ok',
      missing: [],
      extraField: 'should not exist',
    })
    expect(result.success).toBe(false)
  })

  it('Test 6: z.toJSONSchema(VerdictSchema) exposes properties and additionalProperties: false', () => {
    const j = VERDICT_JSON_SCHEMA as {
      type?: string
      properties?: Record<string, unknown>
      additionalProperties?: boolean
      required?: string[]
    }
    expect(j.type).toBe('object')
    expect(j.additionalProperties).toBe(false)
    expect(j.properties).toBeDefined()
    expect(j.properties).toHaveProperty('score')
    expect(j.properties).toHaveProperty('rationale')
    expect(j.properties).toHaveProperty('missing')
    // All three should be required (strict-mode compatibility for OpenAI / Anthropic)
    expect(j.required).toEqual(expect.arrayContaining(['score', 'rationale', 'missing']))
  })
})

describe('Tier3ItemSchema', () => {
  it('Test 7: accepts signalKey: null', () => {
    const result = Tier3ItemSchema.safeParse({ text: 'foo', signalKey: null })
    expect(result.success).toBe(true)
  })

  it('Test 8: rejects when signalKey is missing (nullable not optional — Pitfall 3)', () => {
    const result = Tier3ItemSchema.safeParse({ text: 'foo' })
    expect(result.success).toBe(false)
  })

  it("Test 9: accepts a valid signal-key enum value", () => {
    const result = Tier3ItemSchema.safeParse({
      text: 'Provide reproduction steps',
      signalKey: 'hasCodeBlock',
    })
    expect(result.success).toBe(true)
  })

  it('Test 9b: rejects an unknown signalKey string', () => {
    const result = Tier3ItemSchema.safeParse({ text: 'foo', signalKey: 'notAValidKey' })
    expect(result.success).toBe(false)
  })

  it('Test 9c: rejects text > 120 chars', () => {
    const result = Tier3ItemSchema.safeParse({
      text: 'a'.repeat(121),
      signalKey: null,
    })
    expect(result.success).toBe(false)
  })

  it('Test 9d: rejects empty text', () => {
    const result = Tier3ItemSchema.safeParse({ text: '', signalKey: null })
    expect(result.success).toBe(false)
  })

  it('Test 9e: rejects extra properties (strict)', () => {
    const result = Tier3ItemSchema.safeParse({
      text: 'foo',
      signalKey: null,
      extra: 'no',
    })
    expect(result.success).toBe(false)
  })
})

describe('Tier3OutputSchema', () => {
  it('accepts a valid items array (up to 5)', () => {
    const result = Tier3OutputSchema.safeParse({
      items: [
        { text: 'a', signalKey: null },
        { text: 'b', signalKey: 'hasReproKeywords' },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('rejects more than 5 items', () => {
    const result = Tier3OutputSchema.safeParse({
      items: [
        { text: 'a', signalKey: null },
        { text: 'b', signalKey: null },
        { text: 'c', signalKey: null },
        { text: 'd', signalKey: null },
        { text: 'e', signalKey: null },
        { text: 'f', signalKey: null },
      ],
    })
    expect(result.success).toBe(false)
  })

  it('TIER3_JSON_SCHEMA marks additionalProperties: false and lists all required props', () => {
    const j = TIER3_JSON_SCHEMA as {
      type?: string
      additionalProperties?: boolean
      properties?: Record<string, unknown>
      required?: string[]
    }
    expect(j.type).toBe('object')
    expect(j.additionalProperties).toBe(false)
    expect(j.required).toContain('items')
  })
})
