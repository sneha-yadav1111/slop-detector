// Map GitHub API PR payloads → PullRequestInput (shared by Octokit + REST fetch).

import { extractHunkTokens } from '../../core/pr/parse-hunks.js'
import { hasTestFileChanges, touchesSensitivePath } from '../../core/pr/sensitive-paths.js'
import type { PullRequestInput } from '../../core/pr/types.js'

export interface RawPrFile {
  filename: string
  patch?: string
}

export interface RawPrPayload {
  title: string
  body: string
  changedFiles: string[]
  changedFileCount: number
  linesChanged: number
  commits: string[]
  files?: RawPrFile[]
  reviewComments?: Array<{ path: string; line: number; body: string }>
}

export function mapToPullRequestInput(raw: RawPrPayload): PullRequestInput {
  const patches = (raw.files ?? []).map((f) => f.patch ?? '').filter(Boolean)
  const changedHunkTokens = patches.length > 0 ? extractHunkTokens(patches) : undefined

  return {
    title: raw.title,
    body: raw.body,
    changedFiles: raw.changedFiles,
    changedFileCount: raw.changedFileCount,
    linesChanged: raw.linesChanged,
    commits: raw.commits,
    changedHunkTokens,
    hasTestFileChanges: hasTestFileChanges(raw.changedFiles),
    touchesSensitivePaths: touchesSensitivePath(raw.changedFiles),
    reviewComments: raw.reviewComments,
  }
}
