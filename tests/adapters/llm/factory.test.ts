import { describe, expect, it, vi } from 'vitest'

// Mock the SDKs so adapter construction with a fake key doesn't trigger any real network probing.
vi.mock('@anthropic-ai/sdk', () => {
  class MockAnthropic {
    messages = { create: vi.fn() }
  }
  return { default: MockAnthropic, Anthropic: MockAnthropic }
})
vi.mock('openai', () => {
  class MockOpenAI {
    chat = { completions: { create: vi.fn() } }
  }
  return { default: MockOpenAI, OpenAI: MockOpenAI }
})

import { AnthropicAdapter } from '../../../src/adapters/llm/anthropic.js'
import { DemoAdapter } from '../../../src/adapters/llm/demo.js'
import { makeLLMPort } from '../../../src/adapters/llm/factory.js'
import { OpenAIAdapter } from '../../../src/adapters/llm/openai.js'

describe('makeLLMPort — D-12 routing matrix', () => {
  it('Test 1: DEMO_MODE wins over real keys', () => {
    const p = makeLLMPort('anthropic:claude-haiku-4-5', {
      DEMO_MODE: 'true',
      ANTHROPIC_API_KEY: 'k',
    })
    expect(p).toBeInstanceOf(DemoAdapter)
  })

  it('Test 2: DEMO_MODE wins over auto + no keys', () => {
    expect(makeLLMPort('auto', { DEMO_MODE: 'true' })).toBeInstanceOf(DemoAdapter)
  })

  it("Test 3: model='none' returns null even with keys set", () => {
    expect(
      makeLLMPort('none', { ANTHROPIC_API_KEY: 'k', OPENAI_API_KEY: 'k' }),
    ).toBeNull()
  })

  it("Test 4: model='auto' picks Anthropic when only ANTHROPIC_API_KEY is set", () => {
    expect(makeLLMPort('auto', { ANTHROPIC_API_KEY: 'k' })).toBeInstanceOf(AnthropicAdapter)
  })

  it("Test 5: model='auto' picks OpenAI when only OPENAI_API_KEY is set", () => {
    expect(makeLLMPort('auto', { OPENAI_API_KEY: 'k' })).toBeInstanceOf(OpenAIAdapter)
  })

  it("Test 6: model='auto' prefers Anthropic when both keys are set (D-12 primary)", () => {
    expect(
      makeLLMPort('auto', { ANTHROPIC_API_KEY: 'a', OPENAI_API_KEY: 'o' }),
    ).toBeInstanceOf(AnthropicAdapter)
  })

  it("Test 7: model='' is equivalent to 'auto'", () => {
    expect(makeLLMPort('', { ANTHROPIC_API_KEY: 'k' })).toBeInstanceOf(AnthropicAdapter)
  })

  it("Test 8: model='auto' + no keys → null", () => {
    expect(makeLLMPort('auto', {})).toBeNull()
  })

  it("Test 9: model='anthropic:claude-haiku-4-5' + ANTHROPIC_API_KEY → AnthropicAdapter", () => {
    expect(
      makeLLMPort('anthropic:claude-haiku-4-5', { ANTHROPIC_API_KEY: 'k' }),
    ).toBeInstanceOf(AnthropicAdapter)
  })

  it("Test 10: model='openai:gpt-4o-mini' + OPENAI_API_KEY → OpenAIAdapter", () => {
    expect(makeLLMPort('openai:gpt-4o-mini', { OPENAI_API_KEY: 'k' })).toBeInstanceOf(
      OpenAIAdapter,
    )
  })

  it("Test 11: model='anthropic:...' + no ANTHROPIC_API_KEY → null", () => {
    expect(
      makeLLMPort('anthropic:claude-haiku-4-5', { OPENAI_API_KEY: 'k' }),
    ).toBeNull()
  })

  it("Test 12: model='unknown:foo' + any key → null", () => {
    expect(
      makeLLMPort('unknown:foo', { ANTHROPIC_API_KEY: 'k', OPENAI_API_KEY: 'k' }),
    ).toBeNull()
  })

  it("Test 12b: model='anthropic:' (empty modelId) → null", () => {
    expect(makeLLMPort('anthropic:', { ANTHROPIC_API_KEY: 'k' })).toBeNull()
  })

  it("Test 12c: model with no colon (e.g. 'gpt-5') → null", () => {
    expect(makeLLMPort('gpt-5', { OPENAI_API_KEY: 'k' })).toBeNull()
  })

  it('Test 13: passes modelId through to the constructed adapter', () => {
    const a = makeLLMPort('anthropic:custom-model-id', {
      ANTHROPIC_API_KEY: 'k',
    }) as unknown as { modelId: string }
    expect(a.modelId).toBe('custom-model-id')
    const o = makeLLMPort('openai:custom-gpt', {
      OPENAI_API_KEY: 'k',
    }) as unknown as { modelId: string }
    expect(o.modelId).toBe('custom-gpt')
  })
})
