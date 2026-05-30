// Token-based GitHub REST fetch for the dashboard (native fetch).

import { mapToPullRequestInput, type RawPrFile, type RawPrPayload } from './map-pr.js'
import type { PullRequestInput } from '../../core/pr/types.js'

export interface FetchedPrMeta {
  author: string
  url: string
}

export type FetchPrRestOptions = {
  apiBase?: string
  headers: Record<string, string>
}

async function ghGet<T>(base: string, path: string, headers: Record<string, string>): Promise<T> {
  const res = await fetch(`${base}${path}`, { headers, cache: 'no-store' })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`GitHub ${res.status}: ${body.slice(0, 200)}`)
  }
  return (await res.json()) as T
}

export async function fetchPullRequestRest(
  owner: string,
  repo: string,
  number: number,
  opts: FetchPrRestOptions,
): Promise<PullRequestInput & FetchedPrMeta> {
  const base = opts.apiBase ?? 'https://api.github.com'

  const pr = await ghGet<{
    title: string
    body: string | null
    user?: { login?: string }
    html_url: string
    changed_files: number
    additions: number
    deletions: number
  }>(base, `/repos/${owner}/${repo}/pulls/${number}`, opts.headers)

  const files = await ghGet<Array<{ filename: string; patch?: string }>>(
    base,
    `/repos/${owner}/${repo}/pulls/${number}/files?per_page=100`,
    opts.headers,
  ).catch(() => [] as RawPrFile[])

  const commitData = await ghGet<Array<{ commit: { message: string } }>>(
    base,
    `/repos/${owner}/${repo}/pulls/${number}/commits?per_page=100`,
    opts.headers,
  ).catch(() => [])

  const raw: RawPrPayload = {
    title: pr.title ?? '',
    body: pr.body ?? '',
    changedFiles: files.map((f) => f.filename),
    changedFileCount: pr.changed_files ?? files.length,
    linesChanged: (pr.additions ?? 0) + (pr.deletions ?? 0),
    commits: commitData.map((c) => c.commit.message),
    files,
  }

  const input = mapToPullRequestInput(raw)
  return {
    ...input,
    author: pr.user?.login ?? 'unknown',
    url: pr.html_url,
  }
}
