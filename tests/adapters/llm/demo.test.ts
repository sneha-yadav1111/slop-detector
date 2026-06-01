import { createHash } from 'node:crypto'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DemoAdapter } from '../../../src/adapters/llm/demo.js'
import type { Issue, RepoContext, Signals } from '../../../src/core/types.js'

const ISSUE: Issue = { title: 'crash on save', body: '', labels: [] }
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

function key(title: string) {
  return createHash('sha256').update(title).digest('hex').slice(0, 16)
}

let dir: string
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'demo-'))
})
afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe('DemoAdapter', () => {
  it('Test 1: returns FALLBACK_VERDICT when no fixture file exists', async () => {
    const v = await new DemoAdapter(dir).adjudicate(REQ)
    expect(v.score).toBe(5)
    expect(v.rationale).toMatch(/DEMO_MODE/)
    expect(Array.isArray(v.missing)).toBe(true)
  })

  it('Test 2: returns fixture verdict on match', async () => {
    writeFileSync(
      join(dir, `${key('crash on save')}.json`),
      JSON.stringify({ score: 9, rationale: 'clear', missing: ['repro'] }),
    )
    const v = await new DemoAdapter(dir).adjudicate(REQ)
    expect(v).toEqual({ score: 9, rationale: 'clear', missing: ['repro'] })
  })

  it('Test 3: returns FALLBACK_VERDICT on malformed JSON (does not throw)', async () => {
    writeFileSync(join(dir, `${key('crash on save')}.json`), 'not json {')
    const v = await new DemoAdapter(dir).adjudicate(REQ)
    expect(v.rationale).toMatch(/DEMO_MODE/)
  })

  it('Test 3b: returns FALLBACK_VERDICT when JSON parses but shape is wrong', async () => {
    writeFileSync(
      join(dir, `${key('crash on save')}.json`),
      JSON.stringify({ score: 'high', missing: 'nope' }),
    )
    const v = await new DemoAdapter(dir).adjudicate(REQ)
    expect(v.rationale).toMatch(/DEMO_MODE/)
  })

  it('Test 4: different titles produce different fixture keys (sha256 differs)', () => {
    expect(key('a')).not.toBe(key('b'))
  })

  it('Test 5: same title produces same key (deterministic)', () => {
    expect(key('a')).toBe(key('a'))
  })

  it('Test 6: extractChecklistFromContributing returns non-empty array', async () => {
    const items = await new DemoAdapter(dir).extractChecklistFromContributing({
      contributingMd: '',
      issueType: 'bug',
    })
    expect(items.length).toBeGreaterThan(0)
    expect(items[0].text).toBeDefined()
  })

  it('Test 7: constructor with non-existent dir does NOT throw', () => {
    expect(() => new DemoAdapter('/totally/non/existent/path')).not.toThrow()
  })
})
