import { describe, expect, it } from 'vitest'
import { analyze, verdictFromSignal } from '../../src/core/analyze.js'

describe('Unified cross-track engine', () => {
  it('maps signal scores to coarse verdicts', () => {
    expect(verdictFromSignal(2)).toBe('slop')
    expect(verdictFromSignal(5)).toBe('gray-zone')
    expect(verdictFromSignal(9)).toBe('clean')
  })

  it('analyzes a hollow PR as slop and inverts the score scale', () => {
    const r = analyze({
      kind: 'pr',
      pr: {
        title: 'Update files',
        body: '- updated a.ts\n- modified b.ts\n- changed c.ts',
        changedFiles: ['a.ts', 'b.ts', 'c.ts'],
        changedFileCount: 3,
        linesChanged: 100,
        commits: ['update', 'fix stuff', 'wip'],
      },
    })
    expect(r.kind).toBe('pr')
    expect(r.verdict).toBe('slop')
    expect(r.slopScore).toBeGreaterThanOrEqual(60)
    expect(r.findings.some((f) => /commit messages are generic/.test(f))).toBe(true)
  })

  it('analyzes a substantive PR as clean', () => {
    const r = analyze({
      kind: 'pr',
      pr: {
        title: 'Fix race in token refresh (#482)',
        body: 'Why: two concurrent calls log the user out. Testing: added a unit test. Risk: low.',
        changedFiles: ['src/auth.ts'],
        changedFileCount: 1,
        linesChanged: 40,
        commits: ['Serialize refreshes behind a single in-flight promise'],
      },
    })
    expect(r.verdict).toBe('clean')
    expect(r.slopScore).toBeLessThanOrEqual(40)
  })

  it('analyzes hollow code comments', () => {
    const source = ['// increment the index', 'index++;', '// loop', 'for (const x of xs) {}'].join(
      '\n',
    )
    const r = analyze({ kind: 'comments', source })
    expect(r.kind).toBe('comments')
    expect(r.slopScore).toBeGreaterThan(40)
    expect(r.suggestions.length).toBeGreaterThan(0)
  })

  it('treats comment-free source as neutral, not slop', () => {
    const r = analyze({ kind: 'comments', source: 'const x = 1;\nreturn x;' })
    expect(r.verdict).not.toBe('slop')
  })

  it('analyzes an issue through the same shape', () => {
    const r = analyze({
      kind: 'issue',
      issue: { title: 'It broke', body: 'please fix', labels: [] },
    })
    expect(r.kind).toBe('issue')
    expect(r.suggestions.length).toBeGreaterThan(0)
  })
})
