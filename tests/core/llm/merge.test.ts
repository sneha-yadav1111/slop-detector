import { describe, it, expect } from 'vitest'
import { mergeVerdict } from '../../../src/core/llm/merge.js'
import type { ChecklistItem, ScoredIssue, Signals } from '../../../src/core/types.js'
import type { LLMVerdict } from '../../../src/core/llm/port.js'

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
  const items: ChecklistItem[] = overrides.items ?? []
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

function makeVerdict(overrides: Partial<LLMVerdict> = {}): LLMVerdict {
  return {
    score: 5,
    rationale: 'because',
    missing: [],
    ...overrides,
  }
}

describe('mergeVerdict (D-01 + D-03)', () => {
  // ---------- D-01: score replacement ----------
  it('D-01 — replaces score (heuristic 4 → verdict 8 → merged 8)', () => {
    const scored = makeScored({ score: 4 })
    const verdict = makeVerdict({ score: 8 })
    expect(mergeVerdict(scored, verdict).score).toBe(8)
  })

  it('D-02 — LLM may escape band (heuristic 4 → verdict 2 → merged 2); isGrayZone unchanged', () => {
    const scored = makeScored({ score: 4, isGrayZone: true })
    const verdict = makeVerdict({ score: 2 })
    const merged = mergeVerdict(scored, verdict)
    expect(merged.score).toBe(2)
    expect(merged.isGrayZone).toBe(true) // unchanged — adjudication fact captured elsewhere
  })

  it('D-01 — clamps negative verdict score to 0', () => {
    const scored = makeScored({ score: 5 })
    const verdict = makeVerdict({ score: -5 })
    expect(mergeVerdict(scored, verdict).score).toBe(0)
  })

  it('D-01 — clamps high verdict score to MAX_SCORE=10', () => {
    const scored = makeScored({ score: 5 })
    const verdict = makeVerdict({ score: 99 })
    expect(mergeVerdict(scored, verdict).score).toBe(10)
  })

  // ---------- D-03: items merge ----------
  it('D-03 — heuristic items first, then LLM items in order', () => {
    const scored = makeScored({
      items: [
        { text: 'a' },
        { text: 'b' },
      ],
    })
    const verdict = makeVerdict({ missing: ['c', 'd'] })
    const merged = mergeVerdict(scored, verdict)
    expect(merged.items.map((i) => i.text)).toEqual(['a', 'b', 'c', 'd'])
  })

  it('D-03 — drop LLM item that is a substring of a heuristic item', () => {
    const scored = makeScored({
      items: [{ text: 'Could you share the version of the package?' }],
    })
    const verdict = makeVerdict({ missing: ['version'] })
    const merged = mergeVerdict(scored, verdict)
    expect(merged.items.length).toBe(1)
    expect(merged.items[0]?.text).toBe('Could you share the version of the package?')
  })

  it('D-03 — drop LLM item when heuristic text is a substring of it', () => {
    const scored = makeScored({
      items: [{ text: 'version' }],
    })
    const verdict = makeVerdict({ missing: ['Could you share the version, please?'] })
    const merged = mergeVerdict(scored, verdict)
    expect(merged.items.length).toBe(1)
    expect(merged.items[0]?.text).toBe('version')
  })

  it('D-03 — caps at MAX_ITEMS=5 (3 heuristic + 4 distinct LLM → 5 final)', () => {
    const scored = makeScored({
      items: [{ text: 'h1' }, { text: 'h2' }, { text: 'h3' }],
    })
    const verdict = makeVerdict({ missing: ['l1', 'l2', 'l3', 'l4'] })
    const merged = mergeVerdict(scored, verdict)
    expect(merged.items.length).toBe(5)
    expect(merged.items.map((i) => i.text)).toEqual(['h1', 'h2', 'h3', 'l1', 'l2'])
  })

  it('LLM-05 — sanitization applied to LLM-authored items', () => {
    const scored = makeScored({ items: [] })
    const verdict = makeVerdict({ missing: ['hi @octocat <script>x</script>'] })
    const merged = mergeVerdict(scored, verdict)
    expect(merged.items.length).toBe(1)
    const text = merged.items[0]?.text ?? ''
    expect(text).toContain('`@octocat`')
    expect(text).not.toContain('<script')
  })

  it('D-03 — case-insensitive substring dedupe', () => {
    const scored = makeScored({ items: [{ text: 'VERSION info' }] })
    const verdict = makeVerdict({ missing: ['version'] })
    const merged = mergeVerdict(scored, verdict)
    expect(merged.items.length).toBe(1)
    expect(merged.items[0]?.text).toBe('VERSION info')
  })

  it('missing[] is the source-of-truth: merged.missing === merged.items.map(text)', () => {
    const scored = makeScored({ items: [{ text: 'h1' }] })
    const verdict = makeVerdict({ missing: ['l1', 'l2'] })
    const merged = mergeVerdict(scored, verdict)
    expect(merged.missing).toEqual(merged.items.map((i) => i.text))
  })

  it('signals/issueType/tierUsed/isGrayZone copied unchanged from input', () => {
    const customSignals: Signals = { ...ZERO_SIGNALS, hasCodeBlock: true }
    const scored = makeScored({
      score: 4,
      signals: customSignals,
      issueType: 'feature',
      isGrayZone: true,
      tierUsed: 'issue-form',
      items: [{ text: 'x' }],
    })
    const verdict = makeVerdict({ score: 7, missing: [] })
    const merged = mergeVerdict(scored, verdict)
    expect(merged.signals).toEqual(customSignals)
    expect(merged.issueType).toBe('feature')
    expect(merged.tierUsed).toBe('issue-form')
    expect(merged.isGrayZone).toBe(true)
    expect(merged.score).toBe(7) // score replaced
  })
})
