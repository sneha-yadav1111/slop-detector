#!/usr/bin/env tsx
// Scrape closed PRs from benchmark repos into bench/pr-fixtures/scraped/

import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Octokit } from '@octokit/rest'
import { throttling } from '@octokit/plugin-throttling'
import pLimit from 'p-limit'
import { mapToPullRequestInput } from '../src/adapters/github/map-pr.js'

const ThrottledOctokit = Octokit.plugin(throttling)
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'bench', 'pr-fixtures', 'scraped')

const REPOS = ['microsoft/vscode', 'facebook/react', 'rust-lang/rust']
const PER_REPO = 30

async function main() {
  const token = process.env.GITHUB_TOKEN
  if (!token) {
    console.error('Set GITHUB_TOKEN to scrape PRs.')
    process.exit(1)
  }
  const octokit = new ThrottledOctokit({
    auth: token,
    throttle: {
      onRateLimit: (retryAfter, opts, _o, retryCount) => {
        console.warn(`Rate limit ${opts.method}, retry ${retryCount}`)
        return retryCount < 2
      },
    },
  })
  const limit = pLimit(3)
  mkdirSync(outDir, { recursive: true })

  for (const full of REPOS) {
    const [owner, repo] = full.split('/')
    const dir = join(outDir, `${owner}-${repo}`)
    mkdirSync(dir, { recursive: true })
    const pulls = await octokit.paginate(octokit.rest.pulls.list, {
      owner,
      repo,
      state: 'closed',
      per_page: 100,
      sort: 'updated',
      direction: 'desc',
    })
    const slice = pulls.slice(0, PER_REPO)
    await Promise.all(
      slice.map((pr) =>
        limit(async () => {
          const n = pr.number
          const path = join(dir, `${n}.json`)
          if (existsSync(path)) return
          const detail = await octokit.rest.pulls.get({ owner, repo, pull_number: n })
          const files = await octokit.paginate(octokit.rest.pulls.listFiles, {
            owner,
            repo,
            pull_number: n,
            per_page: 100,
          })
          const commits = await octokit.paginate(octokit.rest.pulls.listCommits, {
            owner,
            repo,
            pull_number: n,
            per_page: 100,
          })
          const input = mapToPullRequestInput({
            title: detail.data.title ?? '',
            body: detail.data.body ?? '',
            changedFiles: files.map((f) => f.filename),
            changedFileCount: detail.data.changed_files ?? files.length,
            linesChanged: (detail.data.additions ?? 0) + (detail.data.deletions ?? 0),
            commits: commits.map((c) => c.commit.message),
            files: files.map((f) => ({ filename: f.filename, patch: f.patch ?? undefined })),
          })
          writeFileSync(
            path,
            JSON.stringify(
              {
                id: `scraped-${owner}-${repo}-${n}`,
                pr: input,
                suggestedSlop: false,
                note: 'Unlabeled scrape — run label-pr-fixtures or heuristics before bake-off',
              },
              null,
              2,
            ),
            'utf8',
          )
          console.log(`Wrote ${path}`)
        }),
      ),
    )
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
