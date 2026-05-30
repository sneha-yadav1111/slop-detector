// Lightweight GitHub REST client using native fetch (no Octokit dependency).
// PR mapping delegates to shared adapter logic.

import { fetchPullRequestRest } from '@adapters/github/fetch-pr-rest.js'

const API = 'https://api.github.com'

export interface ParsedRef {
  owner: string
  repo: string
  kind: 'issue' | 'pr'
  number: number
}

const URL_RE = /github\.com\/([\w.-]+)\/([\w.-]+)\/(issues|pull)\/(\d+)/i

export function parseGitHubRef(input: string): ParsedRef | null {
  const trimmed = input.trim()
  const m = trimmed.match(URL_RE)
  if (m) {
    return {
      owner: m[1],
      repo: m[2],
      kind: m[3].toLowerCase() === 'pull' ? 'pr' : 'issue',
      number: Number(m[4]),
    }
  }
  const short = trimmed.match(/^([\w.-]+)\/([\w.-]+)#(\d+)$/)
  if (short) {
    return { owner: short[1], repo: short[2], kind: 'issue', number: Number(short[3]) }
  }
  const prShort = trimmed.match(/^([\w.-]+)\/([\w.-]+)\/pull\/(\d+)$/i)
  if (prShort) {
    return { owner: prShort[1], repo: prShort[2], kind: 'pr', number: Number(prShort[3]) }
  }
  return null
}

function restHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'slop-detector-web',
  }
  const token = process.env.GITHUB_TOKEN
  if (token) h.Authorization = `Bearer ${token}`
  return h
}

async function gh<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, { headers: restHeaders(), cache: 'no-store' })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`GitHub ${res.status}: ${body.slice(0, 200)}`)
  }
  return (await res.json()) as T
}

export interface FetchedIssue {
  title: string
  body: string
  labels: string[]
  author: string
  url: string
}

export async function fetchIssue(
  owner: string,
  repo: string,
  number: number,
): Promise<FetchedIssue> {
  const data = await gh<{
    title: string
    body: string | null
    labels: Array<string | { name?: string }>
    user?: { login?: string }
    html_url: string
  }>(`/repos/${owner}/${repo}/issues/${number}`)
  return {
    title: data.title ?? '',
    body: data.body ?? '',
    labels: (data.labels ?? [])
      .map((l) => (typeof l === 'string' ? l : (l.name ?? '')))
      .filter(Boolean),
    author: data.user?.login ?? 'unknown',
    url: data.html_url,
  }
}

export interface FetchedPr {
  title: string
  body: string
  author: string
  url: string
  changedFiles: string[]
  changedFileCount: number
  linesChanged: number
  commits: string[]
  changedHunkTokens?: string[]
  hasTestFileChanges?: boolean
  touchesSensitivePaths?: boolean
}

export async function fetchPr(owner: string, repo: string, number: number): Promise<FetchedPr> {
  const mapped = await fetchPullRequestRest(owner, repo, number, { headers: restHeaders() })
  const { author, url, ...prInput } = mapped
  return {
    title: prInput.title,
    body: prInput.body,
    author,
    url,
    changedFiles: prInput.changedFiles ?? [],
    changedFileCount: prInput.changedFileCount ?? 0,
    linesChanged: prInput.linesChanged ?? 0,
    commits: prInput.commits ?? [],
    changedHunkTokens: prInput.changedHunkTokens,
    hasTestFileChanges: prInput.hasTestFileChanges,
    touchesSensitivePaths: prInput.touchesSensitivePaths,
  }
}

export type FetchPrProgressStep = 'pull' | 'files' | 'commits' | 'hunks'

export async function fetchPrWithProgress(
  owner: string,
  repo: string,
  number: number,
  onStep?: (step: FetchPrProgressStep, message: string) => void,
): Promise<FetchedPr> {
  onStep?.('pull', `Fetching pull request ${owner}/${repo}#${number}...`)
  const pr = await gh<{
    title: string
    body: string | null
    user?: { login?: string }
    html_url: string
    changed_files: number
    additions: number
    deletions: number
  }>(`/repos/${owner}/${repo}/pulls/${number}`)

  onStep?.('files', 'Fetching changed files and patches...')
  const files = await gh<Array<{ filename: string; patch?: string }>>(
    `/repos/${owner}/${repo}/pulls/${number}/files?per_page=100`,
  ).catch(() => [])

  onStep?.('commits', 'Fetching commit messages...')
  const commitData = await gh<Array<{ commit: { message: string } }>>(
    `/repos/${owner}/${repo}/pulls/${number}/commits?per_page=100`,
  ).catch(() => [])

  onStep?.('hunks', 'Parsing diff hunks...')
  const { mapToPullRequestInput } = await import('@adapters/github/map-pr.js')
  const input = mapToPullRequestInput({
    title: pr.title ?? '',
    body: pr.body ?? '',
    changedFiles: files.map((f) => f.filename),
    changedFileCount: pr.changed_files ?? files.length,
    linesChanged: (pr.additions ?? 0) + (pr.deletions ?? 0),
    commits: commitData.map((c) => c.commit.message),
    files,
  })

  return {
    title: input.title,
    body: input.body,
    author: pr.user?.login ?? 'unknown',
    url: pr.html_url,
    changedFiles: input.changedFiles ?? [],
    changedFileCount: input.changedFileCount ?? 0,
    linesChanged: input.linesChanged ?? 0,
    commits: input.commits ?? [],
    changedHunkTokens: input.changedHunkTokens,
    hasTestFileChanges: input.hasTestFileChanges,
    touchesSensitivePaths: input.touchesSensitivePaths,
  }
}
