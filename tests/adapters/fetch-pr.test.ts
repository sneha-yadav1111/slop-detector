import { describe, expect, it, vi } from 'vitest'
import { fetchPullRequest } from '../../src/adapters/github/fetch-pr.js'

describe('fetchPullRequest', () => {
  it('maps Octokit responses to PullRequestInput', async () => {
    const octokit = {
      rest: {
        pulls: {
          get: vi.fn().mockResolvedValue({
            data: {
              title: 'Fix bug',
              body: 'Because users saw crashes',
              changed_files: 1,
              additions: 10,
              deletions: 2,
            },
          }),
          listFiles: { endpoint: { merge: vi.fn() } },
          listCommits: { endpoint: { merge: vi.fn() } },
          listReviewComments: { endpoint: { merge: vi.fn() } },
        },
      },
      paginate: vi
        .fn()
        .mockResolvedValueOnce([{ filename: 'src/a.ts', patch: '+function foo() {}' }])
        .mockResolvedValueOnce([{ commit: { message: 'Fix crash on null body' } }])
        .mockResolvedValueOnce([]),
    }

    const input = await fetchPullRequest(octokit as never, 'o', 'r', 1)
    expect(input.title).toBe('Fix bug')
    expect(input.changedFiles).toEqual(['src/a.ts'])
    expect(input.commits).toEqual(['Fix crash on null body'])
    expect(input.hasTestFileChanges).toBe(false)
  })
})
