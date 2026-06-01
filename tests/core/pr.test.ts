import { describe, expect, it } from 'vitest'
import { assessCommit } from '../../src/core/pr/commits.js'
import { scorePr } from '../../src/core/pr/score.js'

describe('PR slop detection (Track A)', () => {
  it('scores a hollow diff-restating PR low', () => {
    const result = scorePr({
      title: 'Update files',
      body: [
        'This PR introduces the following changes:',
        '',
        '- Updated user.ts',
        '- Modified auth.ts',
        '- Refactored helpers.ts',
      ].join('\n'),
      changedFiles: ['src/user.ts', 'src/auth.ts', 'src/helpers.ts'],
      changedFileCount: 3,
      linesChanged: 120,
    })
    expect(result.score).toBeLessThanOrEqual(4)
    expect(result.signals.isDiffRestating || result.signals.hasGenericBoilerplate).toBe(true)
    expect(result.missing.length).toBeGreaterThan(0)
  })

  it('scores a substantive PR high', () => {
    const result = scorePr({
      title: 'Fix race condition in token refresh (#482)',
      body: [
        '## Why',
        'Currently two concurrent requests can both trigger a token refresh, which',
        'causes the second to invalidate the first and log the user out. This fixes',
        'the root cause by serializing refreshes behind a single in-flight promise.',
        '',
        '## Testing',
        'Added a unit test that fires 10 concurrent calls and asserts a single refresh.',
        'Also verified manually against staging.',
        '',
        '## Risk',
        'Low — the lock is scoped per session; follow-up needed for multi-tab.',
      ].join('\n'),
      changedFiles: ['src/auth/token.ts', 'tests/auth/token.test.ts'],
      changedFileCount: 2,
      linesChanged: 90,
    })
    expect(result.score).toBeGreaterThanOrEqual(8)
    expect(result.signals.hasMotivation).toBe(true)
    expect(result.signals.hasTestingNotes).toBe(true)
    expect(result.signals.isDiffRestating).toBe(false)
  })

  it('flags generic commit messages as slop', () => {
    expect(assessCommit('update').isSlop).toBe(true)
    expect(assessCommit('fix stuff').isSlop).toBe(true)
    expect(assessCommit('WIP').isSlop).toBe(true)
    expect(assessCommit('address comments').isSlop).toBe(true)
  })

  it('does not flag descriptive or mechanical commits', () => {
    expect(assessCommit('Serialize token refresh behind a single in-flight promise').isSlop).toBe(
      false,
    )
    expect(assessCommit('Merge branch main into feature/auth').isSlop).toBe(false)
    expect(assessCommit('bump eslint to 9.0.0').isSlop).toBe(false)
  })

  it('flags changelog-only PR (pr-slop-03 pattern)', () => {
    const result = scorePr({
      title: 'Add new functionality',
      body: '## Summary of changes\n\nThis change adds new functionality to the application. The following files were modified to implement the feature. Key changes include updates to the relevant modules.',
      changedFiles: ['src/feature.ts'],
      changedFileCount: 1,
      linesChanged: 80,
    })
    expect(result.signals.isChangelogOnly).toBe(true)
    expect(result.score).toBeLessThanOrEqual(3)
  })

  it('computes commit slop ratio', () => {
    const result = scorePr({
      title: 'x',
      body: 'why: fixes a real bug because of context',
      commits: ['update', 'fix', 'Add retry with exponential backoff for flaky network calls'],
    })
    expect(result.commitSlopRatio).toBeCloseTo(2 / 3, 5)
  })
})
