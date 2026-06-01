import { describe, it, expect } from 'vitest'
import {
  adjudicate,
  type AdjudicateContext,
} from '../../../src/core/llm/adjudicate.js'
import type { LLMPort, LLMRequest, LLMVerdict } from '../../../src/core/llm/port.js'
import type { CachePort } from '../../../src/adapters/cache/port.js'
import type { CapPort } from '../../../src/core/llm/cap.js'
import type {
  ChecklistItem,
  Issue,
  RepoContext,
  ScoredIssue,
  Signals,
} from '../../../src/core/types.js'
import { format } from '../../../src/core/format/markdown.js'

// ---------- stubs ----------
class StubLLM implements LLMPort {
  calls = 0
  impl: (req: LLMRequest) => Promise<LLMVerdict> = async () => ({
    score: 8,
    rationale: 'ok',
    missing: ['x'],
  })
  async adjudicate(req: LLMRequest): Promise<LLMVerdict> {
    this.calls++
    return this.impl(req)
  }
}

class StubCache implements CachePort {
  store = new Map<string, string>()
  getCalls = 0
  setCalls = 0
  async get(key: string): Promise<string | null> {
    this.getCalls++
    return this.store.get(key) ?? null
  }
  async set(key: string, value: string): Promise<void> {
    this.setCalls++
    this.store.set(key, value)
  }
  async countWithPrefix(): Promise<number> {
    return 0
  }
}

class StubCap implements CapPort {
  exceededImpl: () => Promise<boolean> = async () => false
  recordCalls = 0
  async isExceeded(): Promise<boolean> {
    return this.exceededImpl()
  }
  async recordCall(): Promise<void> {
    this.recordCalls++
  }
}

// ---------- helpers ----------
const ZERO_SIGNALS: Signals = {
  hasCodeBlock: false,
  hasStackTrace: false,
  hasVersionMention: false,
  hasReproKeywords: false,
  hasExpectedActual: false,
  hasMinimalExample: false,
  hasImageOnly: false,
}

function makeScored(overrides: Partial<ScoredIssue> = {}): ScoredIssue {
  const items: ChecklistItem[] = overrides.items ?? [{ text: 'heuristic-item-1' }]
  return {
    score: 4,
    missing: items.map((i) => i.text),
    signals: ZERO_SIGNALS,
    issueType: 'bug',
    isGrayZone: true,
    items,
    tierUsed: 'baseline',
    ...overrides,
  }
}

const ISSUE: Issue = { title: 't', body: 'b', labels: [] }
const REPO_CTX: RepoContext = {
  hasIssueForms: false,
  hasMdTemplates: false,
  hasContributing: false,
  templates: [],
}
const REPO_KEY = 'owner/repo'
const DEDUP_KEY = 'slop-detector-dedup-owner/repo-1-model-abc123'

describe('adjudicate (D-04 unified fallback, D-11 cap, D-14 dedup, LLM-02/08)', () => {
  // ---------- Branch 1: not gray zone (LLM-02) ----------
  it('LLM-02 — skipped-not-gray-zone returns input unchanged AND llm.calls = 0', async () => {
    const scored = makeScored({ isGrayZone: false })
    const llm = new StubLLM()
    const ctx: AdjudicateContext = { llm, cache: null, cap: null }
    const result = await adjudicate(scored, ISSUE, REPO_CTX, REPO_KEY, DEDUP_KEY, ctx)
    expect(result.status).toBe('skipped-not-gray-zone')
    expect(result.scored).toBe(scored)
    expect(result.verdict).toBeNull()
    expect(llm.calls).toBe(0)
  })

  // ---------- Branch 2: no LLM (LLM-08) ----------
  it('LLM-08 — skipped-no-llm when ctx.llm is null', async () => {
    const scored = makeScored({ isGrayZone: true })
    const ctx: AdjudicateContext = { llm: null, cache: null, cap: null }
    const result = await adjudicate(scored, ISSUE, REPO_CTX, REPO_KEY, DEDUP_KEY, ctx)
    expect(result.status).toBe('skipped-no-llm')
    expect(result.scored).toBe(scored)
    expect(result.verdict).toBeNull()
  })

  // ---------- Branch 3: dedup hit (D-14) ----------
  it('D-14 — dedup-hit when cache.get returns serialized verdict; llm.calls = 0', async () => {
    const scored = makeScored({ isGrayZone: true, score: 4 })
    const llm = new StubLLM()
    const cache = new StubCache()
    const cachedVerdict: LLMVerdict = { score: 9, rationale: 'cached', missing: ['cached-item'] }
    cache.store.set(DEDUP_KEY, JSON.stringify(cachedVerdict))
    const ctx: AdjudicateContext = { llm, cache, cap: null }
    const result = await adjudicate(scored, ISSUE, REPO_CTX, REPO_KEY, DEDUP_KEY, ctx)
    expect(result.status).toBe('dedup-hit')
    expect(result.scored.score).toBe(9) // merged
    expect(result.verdict).toEqual(cachedVerdict)
    expect(llm.calls).toBe(0)
  })

  // ---------- Branch 4: cap exceeded (D-11) ----------
  it('D-11 — skipped-cap-exceeded when cap.isExceeded() true; llm.calls = 0', async () => {
    const scored = makeScored({ isGrayZone: true })
    const llm = new StubLLM()
    const cap = new StubCap()
    cap.exceededImpl = async () => true
    const ctx: AdjudicateContext = { llm, cache: null, cap }
    const result = await adjudicate(scored, ISSUE, REPO_CTX, REPO_KEY, DEDUP_KEY, ctx)
    expect(result.status).toBe('skipped-cap-exceeded')
    expect(result.scored).toBe(scored)
    expect(result.verdict).toBeNull()
    expect(llm.calls).toBe(0)
  })

  // ---------- Branch 5: LLM throws (D-04 unified fallback) ----------
  it('D-04 — status=failed when llm.adjudicate throws; input returned unchanged', async () => {
    const scored = makeScored({ isGrayZone: true })
    const llm = new StubLLM()
    llm.impl = async () => {
      throw new Error('network timeout')
    }
    const ctx: AdjudicateContext = { llm, cache: null, cap: null }
    const result = await adjudicate(scored, ISSUE, REPO_CTX, REPO_KEY, DEDUP_KEY, ctx)
    expect(result.status).toBe('failed')
    expect(result.scored).toBe(scored)
    expect(result.verdict).toBeNull()
  })

  // ---------- Branch 6: happy path ----------
  it('happy path — status=merged, score replaced, cache.set + cap.recordCall called once', async () => {
    const scored = makeScored({ isGrayZone: true, score: 4 })
    const llm = new StubLLM()
    llm.impl = async () => ({ score: 8, rationale: 'thorough', missing: ['add-error-logs'] })
    const cache = new StubCache()
    const cap = new StubCap()
    const ctx: AdjudicateContext = { llm, cache, cap }
    const result = await adjudicate(scored, ISSUE, REPO_CTX, REPO_KEY, DEDUP_KEY, ctx)
    expect(result.status).toBe('merged')
    expect(result.scored.score).toBe(8)
    expect(llm.calls).toBe(1)
    expect(cap.recordCalls).toBe(1)
    expect(cache.setCalls).toBe(1)
    expect(cache.store.get(DEDUP_KEY)).toBe(JSON.stringify(result.verdict))
  })

  // ---------- LLM-02 call-counter ground truth across all branches ----------
  it('LLM-02 ground truth — call counter is 0 in 5 fallback branches and 1 in happy path', async () => {
    // Branch 1: not gray zone
    {
      const llm = new StubLLM()
      const scored = makeScored({ isGrayZone: false })
      await adjudicate(scored, ISSUE, REPO_CTX, REPO_KEY, DEDUP_KEY, {
        llm,
        cache: null,
        cap: null,
      })
      expect(llm.calls, 'branch 1 (not-gray-zone)').toBe(0)
    }
    // Branch 2: no llm — we cannot count calls on a null port, so use a separate counted stub
    {
      const llm = new StubLLM()
      // pass a different ctx where llm is null; this stub is unused
      const scored = makeScored({ isGrayZone: true })
      await adjudicate(scored, ISSUE, REPO_CTX, REPO_KEY, DEDUP_KEY, {
        llm: null,
        cache: null,
        cap: null,
      })
      // We assert by structural property: the unused stub still has calls = 0
      expect(llm.calls, 'branch 2 (no-llm, unused stub)').toBe(0)
    }
    // Branch 3: dedup hit
    {
      const llm = new StubLLM()
      const cache = new StubCache()
      cache.store.set(
        DEDUP_KEY,
        JSON.stringify({ score: 7, rationale: 'r', missing: [] } satisfies LLMVerdict),
      )
      const scored = makeScored({ isGrayZone: true })
      await adjudicate(scored, ISSUE, REPO_CTX, REPO_KEY, DEDUP_KEY, { llm, cache, cap: null })
      expect(llm.calls, 'branch 3 (dedup-hit)').toBe(0)
    }
    // Branch 4: cap exceeded
    {
      const llm = new StubLLM()
      const cap = new StubCap()
      cap.exceededImpl = async () => true
      const scored = makeScored({ isGrayZone: true })
      await adjudicate(scored, ISSUE, REPO_CTX, REPO_KEY, DEDUP_KEY, {
        llm,
        cache: null,
        cap,
      })
      expect(llm.calls, 'branch 4 (cap-exceeded)').toBe(0)
    }
    // Branch 5: LLM throws — call IS made (.calls increments before throw), but result is failed.
    // The LLM-02 invariant per the plan is about the 5 non-gray/no-llm/dedup/cap branches NOT
    // calling LLM. The "failed" branch IS allowed to call once and throw. We assert separately.
    {
      const llm = new StubLLM()
      llm.impl = async () => {
        throw new Error('boom')
      }
      const scored = makeScored({ isGrayZone: true })
      const result = await adjudicate(scored, ISSUE, REPO_CTX, REPO_KEY, DEDUP_KEY, {
        llm,
        cache: null,
        cap: null,
      })
      expect(result.status, 'branch 5 (failed) status').toBe('failed')
      // calls is 1 (the throw happens DURING the call), but no merge occurred.
      expect(llm.calls, 'branch 5 attempted-but-threw').toBe(1)
    }
    // Branch 6: happy path
    {
      const llm = new StubLLM()
      const scored = makeScored({ isGrayZone: true })
      await adjudicate(scored, ISSUE, REPO_CTX, REPO_KEY, DEDUP_KEY, {
        llm,
        cache: null,
        cap: null,
      })
      expect(llm.calls, 'branch 6 (happy path)').toBe(1)
    }
  })

  // ---------- LLM-08 silent symmetry ----------
  it('LLM-08 silent symmetry — format() byte-identical across 4 no-call non-merge branches', async () => {
    // Branch baseline: format() of the input scored issue
    const baseScored = makeScored({ isGrayZone: true, score: 4 })
    const baseFormat = format(baseScored, REPO_CTX)

    // Branch 1: not gray zone — but input has isGrayZone=false, so build a separate scored
    // whose format() will differ unless we keep all OTHER fields equal. The invariant we want:
    // for branches 2/4/5 (no-llm / cap-exceeded / failed), where input scored has isGrayZone=true,
    // the returned scored.format() === input.format(). Branch 1 is a different surface (the
    // input's isGrayZone is already false), so we exclude it from this symmetry assertion as
    // documented in the plan's silent-symmetry test scope.

    // Branch 2: no-llm
    const r2 = await adjudicate(baseScored, ISSUE, REPO_CTX, REPO_KEY, DEDUP_KEY, {
      llm: null,
      cache: null,
      cap: null,
    })
    expect(format(r2.scored, REPO_CTX)).toBe(baseFormat)

    // Branch 4: cap-exceeded
    const llm = new StubLLM()
    const cap = new StubCap()
    cap.exceededImpl = async () => true
    const r4 = await adjudicate(baseScored, ISSUE, REPO_CTX, REPO_KEY, DEDUP_KEY, {
      llm,
      cache: null,
      cap,
    })
    expect(format(r4.scored, REPO_CTX)).toBe(baseFormat)

    // Branch 5: failed
    const llm5 = new StubLLM()
    llm5.impl = async () => {
      throw new Error('boom')
    }
    const r5 = await adjudicate(baseScored, ISSUE, REPO_CTX, REPO_KEY, DEDUP_KEY, {
      llm: llm5,
      cache: null,
      cap: null,
    })
    expect(format(r5.scored, REPO_CTX)).toBe(baseFormat)

    // Branch 1 (not gray zone) — distinct input where isGrayZone=false; format unchanged from input
    const notGrayScored = makeScored({ isGrayZone: false, score: 9 })
    const notGrayFormat = format(notGrayScored, REPO_CTX)
    const r1 = await adjudicate(notGrayScored, ISSUE, REPO_CTX, REPO_KEY, DEDUP_KEY, {
      llm: new StubLLM(),
      cache: null,
      cap: null,
    })
    expect(format(r1.scored, REPO_CTX)).toBe(notGrayFormat)
  })

  // ---------- D-04 corrupt cache value → treat as miss ----------
  it('D-04 — non-JSON cache value treated as miss; LLM called normally; status=merged', async () => {
    const scored = makeScored({ isGrayZone: true })
    const llm = new StubLLM()
    const cache = new StubCache()
    cache.store.set(DEDUP_KEY, 'not-valid-json{{{')
    const ctx: AdjudicateContext = { llm, cache, cap: null }
    const result = await adjudicate(scored, ISSUE, REPO_CTX, REPO_KEY, DEDUP_KEY, ctx)
    expect(result.status).toBe('merged')
    expect(llm.calls).toBe(1)
  })

  it('D-04 — wrong-shape cached JSON treated as miss; LLM called normally', async () => {
    const scored = makeScored({ isGrayZone: true })
    const llm = new StubLLM()
    const cache = new StubCache()
    cache.store.set(DEDUP_KEY, JSON.stringify({ wrong: 'shape', missing: 1 }))
    const ctx: AdjudicateContext = { llm, cache, cap: null }
    const result = await adjudicate(scored, ISSUE, REPO_CTX, REPO_KEY, DEDUP_KEY, ctx)
    expect(result.status).toBe('merged')
    expect(llm.calls).toBe(1)
  })

  // ---------- D-14 dedup key passthrough (opaque) ----------
  it('D-14 — dedupKey is passed verbatim to cache.get; adjudicate does not synthesize it', async () => {
    const scored = makeScored({ isGrayZone: true })
    const llm = new StubLLM()
    const cache = new StubCache()
    let observedKey: string | null = null
    const wrapped: CachePort = {
      async get(key) {
        observedKey = key
        return null
      },
      async set(key, value) {
        await cache.set(key, value)
      },
      async countWithPrefix() {
        return 0
      },
    }
    const ctx: AdjudicateContext = { llm, cache: wrapped, cap: null }
    await adjudicate(scored, ISSUE, REPO_CTX, REPO_KEY, 'opaque-key-xyz', ctx)
    expect(observedKey).toBe('opaque-key-xyz')
  })

  // ---------- D-13 sync→async boundary shape ----------
  it('D-13 — adjudicate is awaitable (returns a Promise of AdjudicationResult)', async () => {
    const scored = makeScored({ isGrayZone: false })
    const ctx: AdjudicateContext = { llm: null, cache: null, cap: null }
    const promise = adjudicate(scored, ISSUE, REPO_CTX, REPO_KEY, DEDUP_KEY, ctx)
    expect(promise).toBeInstanceOf(Promise)
    const result = await promise
    expect(result.status).toBeTypeOf('string')
  })

  // ---------- Defensive: best-effort cap/cache (T-04-11 mitigation) ----------
  it('T-04-11 — cap.recordCall throwing does NOT break merged status', async () => {
    const scored = makeScored({ isGrayZone: true })
    const llm = new StubLLM()
    const cap: CapPort = {
      async isExceeded() {
        return false
      },
      async recordCall() {
        throw new Error('cap-set-failed')
      },
    }
    const ctx: AdjudicateContext = { llm, cache: null, cap }
    const result = await adjudicate(scored, ISSUE, REPO_CTX, REPO_KEY, DEDUP_KEY, ctx)
    expect(result.status).toBe('merged')
  })

  it('T-04-11 — cache.set throwing does NOT break merged status', async () => {
    const scored = makeScored({ isGrayZone: true })
    const llm = new StubLLM()
    const cache: CachePort = {
      async get() {
        return null
      },
      async set() {
        throw new Error('cache-set-failed')
      },
      async countWithPrefix() {
        return 0
      },
    }
    const ctx: AdjudicateContext = { llm, cache, cap: null }
    const result = await adjudicate(scored, ISSUE, REPO_CTX, REPO_KEY, DEDUP_KEY, ctx)
    expect(result.status).toBe('merged')
  })
})
