// src/adapters/llm/demo.ts
// LLM-09: DEMO_MODE adapter — returns canned verdicts keyed by sha256(title) of the issue.
// Pre-baked fixtures in tests/fixtures/llm-demo/ ship the Phase 5 screencast and the
// DEMO-05 resilience smoke test (invalid keys + DEMO_MODE=true -> hero output unaffected).
//
// Never throws — fixture miss or malformed JSON falls through to FALLBACK_VERDICT.
// This honors the LLM-08 silent-symmetry invariant even when fixtures are absent.

import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type {
  LLMPort,
  LLMRequest,
  LLMVerdict,
  PrLLMRequest,
  Tier3ExtractRequest,
} from '../../core/llm/port.js'
import type { ChecklistItem } from '../../core/types.js'

const FALLBACK_VERDICT: LLMVerdict = {
  score: 5,
  rationale: 'DEMO_MODE: fixture not found for this issue; returning neutral verdict.',
  missing: [
    'Add a fixture for this issue title under tests/fixtures/llm-demo/<sha256-of-title>.json',
  ],
}

const DEMO_TIER3_ITEMS: ChecklistItem[] = [
  { text: 'DEMO_MODE: include version of the affected package' },
  { text: 'DEMO_MODE: share a minimal reproducer' },
]

function keyFromTitle(title: string): string {
  return createHash('sha256').update(title).digest('hex').slice(0, 16)
}

function isLLMVerdict(raw: unknown): raw is LLMVerdict {
  if (typeof raw !== 'object' || raw === null) return false
  const r = raw as Partial<LLMVerdict>
  return typeof r.score === 'number' && typeof r.rationale === 'string' && Array.isArray(r.missing)
}

export class DemoAdapter implements LLMPort {
  private fixturesDir: string

  constructor(fixturesDir: string) {
    this.fixturesDir = fixturesDir
  }

  async adjudicate(req: LLMRequest): Promise<LLMVerdict> {
    const key = keyFromTitle(req.issue.title)
    const path = join(this.fixturesDir, `${key}.json`)
    if (!existsSync(path)) return FALLBACK_VERDICT
    try {
      const raw: unknown = JSON.parse(readFileSync(path, 'utf-8'))
      return isLLMVerdict(raw) ? raw : FALLBACK_VERDICT
    } catch {
      return FALLBACK_VERDICT
    }
  }

  async adjudicatePr(_req: PrLLMRequest): Promise<LLMVerdict> {
    return FALLBACK_VERDICT
  }

  async extractChecklistFromContributing(_req: Tier3ExtractRequest): Promise<ChecklistItem[]> {
    return DEMO_TIER3_ITEMS
  }
}
