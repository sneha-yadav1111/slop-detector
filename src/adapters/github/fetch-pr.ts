// Fetch pull request data via Octokit → PullRequestInput.

import type { Octokit } from '@octokit/rest'
import { mapToPullRequestInput, type RawPrPayload } from './map-pr.js'
import type { PullRequestInput } from '../../core/pr/types.js'

type OctokitLike = Pick<Octokit, 'paginate' | 'rest'>

export async function fetchPullRequest(
  octokit: OctokitLike,
  owner: string,
  repo: string,
  number: number,
): Promise<PullRequestInput> {
  const pr = await octokit.rest.pulls.get({ owner, repo, pull_number: number })

  const files = await octokit.paginate(octokit.rest.pulls.listFiles, {
    owner,
    repo,
    pull_number: number,
    per_page: 100,
  })

  const commits = await octokit.paginate(octokit.rest.pulls.listCommits, {
    owner,
    repo,
    pull_number: number,
    per_page: 100,
  })

  const reviewComments = await octokit.paginate(octokit.rest.pulls.listReviewComments, {
    owner,
    repo,
    pull_number: number,
    per_page: 100,
  }).catch(() => [])

  const raw: RawPrPayload = {
    title: pr.data.title ?? '',
    body: pr.data.body ?? '',
    changedFiles: files.map((f) => f.filename),
    changedFileCount: pr.data.changed_files ?? files.length,
    linesChanged: (pr.data.additions ?? 0) + (pr.data.deletions ?? 0),
    commits: commits.map((c) => c.commit.message),
    files: files.map((f) => ({ filename: f.filename, patch: f.patch ?? undefined })),
    reviewComments: reviewComments.map((c) => ({
      path: c.path,
      line: c.line ?? c.original_line ?? 0,
      body: c.body ?? '',
    })),
  }

  return mapToPullRequestInput(raw)
}
