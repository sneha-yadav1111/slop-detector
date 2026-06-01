import { describe, it, expect, expectTypeOf } from 'vitest'
import type {
  Issue,
  Signals,
  IssueType,
  RepoContext,
  ChecklistItem,
  ScoredIssue,
} from '../../src/core/types.js'
import type {
  LLMPort,
  LLMRequest,
  LLMVerdict,
  Tier3ExtractRequest,
} from '../../src/core/llm/port.js'

describe('Phase 1 DTO shapes', () => {
  it('Signals has exactly the 7 expected boolean keys', () => {
    const s: Signals = {
      hasCodeBlock: false,
      hasStackTrace: false,
      hasVersionMention: false,
      hasReproKeywords: false,
      hasExpectedActual: false,
      hasMinimalExample: false,
      hasImageOnly: false,
    }
    const keys = Object.keys(s).sort()
    expect(keys).toEqual([
      'hasCodeBlock',
      'hasExpectedActual',
      'hasImageOnly',
      'hasMinimalExample',
      'hasReproKeywords',
      'hasStackTrace',
      'hasVersionMention',
    ])
  })

  it('IssueType accepts only bug | feature | question', () => {
    const types: IssueType[] = ['bug', 'feature', 'question']
    expect(types).toHaveLength(3)
  })

  it('Issue, RepoContext, ChecklistItem, ScoredIssue compile with full shape', () => {
    const issue: Issue = { title: 't', body: 'b', labels: [] }
    const ctx: RepoContext = {
      hasIssueForms: false,
      hasMdTemplates: false,
      hasContributing: false,
      templates: [],
    }
    const item: ChecklistItem = { text: 'x', signalKey: 'hasCodeBlock' }
    const scored: ScoredIssue = {
      score: 5,
      missing: [],
      signals: {
        hasCodeBlock: false,
        hasStackTrace: false,
        hasVersionMention: false,
        hasReproKeywords: false,
        hasExpectedActual: false,
        hasMinimalExample: false,
        hasImageOnly: false,
      },
      issueType: 'bug',
      isGrayZone: true,
      items: [item],
      tierUsed: 'baseline',
    }
    expect(issue.body).toBe('b')
    expect(ctx.templates).toEqual([])
    expect(scored.score).toBe(5)
  })

  it('LLMPort interface is satisfied by a mock object', () => {
    const mockLLM: LLMPort = {
      async adjudicate(req: LLMRequest): Promise<LLMVerdict> {
        return { score: 5, rationale: 'mock', missing: [] }
      },
      async extractChecklistFromContributing(
        req: Tier3ExtractRequest,
      ): Promise<ChecklistItem[]> {
        return []
      },
    }
    expectTypeOf(mockLLM.adjudicate).toBeFunction()
    expect(typeof mockLLM.adjudicate).toBe('function')
    expectTypeOf(mockLLM.extractChecklistFromContributing).toBeFunction()
    expect(typeof mockLLM.extractChecklistFromContributing).toBe('function')
  })

  it('IssueType narrows correctly in switch', () => {
    function describe(t: IssueType): string {
      switch (t) {
        case 'bug': return 'b'
        case 'feature': return 'f'
        case 'question': return 'q'
      }
    }
    expect(describe('bug')).toBe('b')
    expect(describe('feature')).toBe('f')
    expect(describe('question')).toBe('q')
  })
})

describe('Phase 4 type extensions', () => {
  it('Test 1: RepoContext without tier3Items still type-checks (backward compatible)', () => {
    const r: RepoContext = {
      hasIssueForms: false,
      hasMdTemplates: false,
      hasContributing: false,
      templates: [],
    }
    expect(r.tier3Items).toBeUndefined()
  })

  it('Test 2: RepoContext with tier3Items type-checks', () => {
    const r: RepoContext = {
      hasIssueForms: false,
      hasMdTemplates: false,
      hasContributing: true,
      templates: [],
      tier3Items: [{ text: 'foo' }, { text: 'bar', signalKey: 'hasCodeBlock' }],
    }
    expect(r.tier3Items).toHaveLength(2)
    expect(r.tier3Items?.[0]?.text).toBe('foo')
  })

  it('Test 3: LLMPort requires both adjudicate and extractChecklistFromContributing', () => {
    const mockLLM: LLMPort = {
      async adjudicate(): Promise<LLMVerdict> {
        return { score: 7, rationale: 'r', missing: [] }
      },
      async extractChecklistFromContributing(
        req: Tier3ExtractRequest,
      ): Promise<ChecklistItem[]> {
        // touch req so it's not flagged unused
        expect(['bug', 'feature', 'question']).toContain(req.issueType)
        return [{ text: 'extracted item' }]
      },
    }
    expectTypeOf(mockLLM.adjudicate).toBeFunction()
    expectTypeOf(mockLLM.extractChecklistFromContributing).toBeFunction()
  })

  it('Test 4: a class implementing only adjudicate triggers a TypeScript error', () => {
    // The @ts-expect-error below asserts that omitting extractChecklistFromContributing
    // is a TypeScript compile error. If the error directive is unused (i.e., the
    // assignment actually compiles), tsc --noEmit will fail on this very line —
    // which is exactly the behavior we want to encode.
    // @ts-expect-error — LLMPort requires extractChecklistFromContributing too.
    const incomplete: LLMPort = {
      async adjudicate(): Promise<LLMVerdict> {
        return { score: 0, rationale: '', missing: [] }
      },
    }
    expect(typeof incomplete.adjudicate).toBe('function')
  })

  it('Tier3ExtractRequest carries contributingMd and issueType', () => {
    const req: Tier3ExtractRequest = {
      contributingMd: '# Contributing\n\nSteps to repro required.',
      issueType: 'bug',
    }
    expect(req.contributingMd.length).toBeGreaterThan(0)
    expect(req.issueType).toBe('bug')
  })
})
