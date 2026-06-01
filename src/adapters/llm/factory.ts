// src/adapters/llm/factory.ts
// LLM-01 + D-12: provider-routed LLMPort factory.
// Routing rules (in order):
//   1. env.DEMO_MODE === 'true' -> DemoAdapter (LLM-09 — overrides every key check)
//   2. modelInput === 'none' -> null (kill switch)
//   3. modelInput === '' | 'auto' -> first provider with a key, in priority order:
//        Anthropic -> OpenAI -> OpenRouter -> Gemini -> null
//   4. modelInput === '<provider>:<model-id>' -> that provider iff its key is set, else null
//
// OpenRouter and Gemini are OpenAI-API-compatible, so they reuse OpenAIAdapter with a
// custom baseURL + json_object mode (their endpoints don't reliably support strict
// json_schema). Both have free tiers, making them ideal BYOK defaults.
//
// Callers (main.ts, scripts/benchmark.ts) never branch on provider — the factory hides it.
// Falling through to null is the silent-default for heuristics-only operation (LLM-08).

import type { LLMPort } from '../../core/llm/port.js'
import { AnthropicAdapter } from './anthropic.js'
import { DemoAdapter } from './demo.js'
import { OpenAIAdapter } from './openai.js'

const DEFAULT_ANTHROPIC_MODEL = 'claude-haiku-4-5'
const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini'
// Free-tier-friendly defaults.
const DEFAULT_OPENROUTER_MODEL = 'meta-llama/llama-3.3-70b-instruct:free'
const DEFAULT_GEMINI_MODEL = 'gemini-2.0-flash'

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/'

const OPENROUTER_HEADERS = {
  'HTTP-Referer': 'https://github.com/sneha-yadav1111/slop-scan',
  'X-Title': 'Slop Detector',
}

function makeOpenRouter(apiKey: string, modelId: string): OpenAIAdapter {
  return new OpenAIAdapter(apiKey, modelId, {
    baseURL: OPENROUTER_BASE_URL,
    jsonObjectMode: true,
    defaultHeaders: OPENROUTER_HEADERS,
  })
}

function makeGemini(apiKey: string, modelId: string): OpenAIAdapter {
  return new OpenAIAdapter(apiKey, modelId, {
    baseURL: GEMINI_BASE_URL,
    jsonObjectMode: true,
  })
}

export function makeLLMPort(
  modelInput: string,
  env: NodeJS.ProcessEnv,
  demoFixturesDir = 'tests/fixtures/llm-demo',
): LLMPort | null {
  // Rule 1: DEMO_MODE wins over everything
  if (env.DEMO_MODE === 'true') {
    return new DemoAdapter(demoFixturesDir)
  }

  // Rule 2: kill switch
  if (modelInput === 'none') return null

  // Rule 3: auto-detect (empty input or explicit 'auto')
  if (modelInput === '' || modelInput === 'auto') {
    if (env.ANTHROPIC_API_KEY) {
      return new AnthropicAdapter(env.ANTHROPIC_API_KEY, DEFAULT_ANTHROPIC_MODEL)
    }
    if (env.OPENAI_API_KEY) {
      return new OpenAIAdapter(env.OPENAI_API_KEY, DEFAULT_OPENAI_MODEL)
    }
    if (env.OPENROUTER_API_KEY) {
      return makeOpenRouter(
        env.OPENROUTER_API_KEY,
        env.OPENROUTER_MODEL ?? DEFAULT_OPENROUTER_MODEL,
      )
    }
    if (env.GEMINI_API_KEY) {
      return makeGemini(env.GEMINI_API_KEY, env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL)
    }
    return null
  }

  // Rule 4: explicit provider:model
  const colonIdx = modelInput.indexOf(':')
  if (colonIdx === -1) return null
  const provider = modelInput.slice(0, colonIdx)
  const modelId = modelInput.slice(colonIdx + 1)
  if (!modelId) return null

  if (provider === 'anthropic' && env.ANTHROPIC_API_KEY) {
    return new AnthropicAdapter(env.ANTHROPIC_API_KEY, modelId)
  }
  if (provider === 'openai' && env.OPENAI_API_KEY) {
    return new OpenAIAdapter(env.OPENAI_API_KEY, modelId)
  }
  if (provider === 'openrouter' && env.OPENROUTER_API_KEY) {
    return makeOpenRouter(env.OPENROUTER_API_KEY, modelId)
  }
  if (provider === 'gemini' && env.GEMINI_API_KEY) {
    return makeGemini(env.GEMINI_API_KEY, modelId)
  }
  return null
}
