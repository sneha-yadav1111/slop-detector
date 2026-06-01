// src/action/main.ts — issue + pull_request orchestrator.

import { createHash } from 'node:crypto'
import * as core from '@actions/core'
import * as github from '@actions/github'
import { RunnerCachePort } from '../adapters/cache/runner-cache.js'
import { reportToDashboard, verdictFromScore } from '../adapters/dashboard/report.js'
import { fetchPullRequest } from '../adapters/github/fetch-pr.js'
import { postOrUpdateComment } from '../adapters/github/io.js'
import type { LabelAction } from '../adapters/github/labels.js'
import { applyLabel, ensureLabel, removeLabel } from '../adapters/github/labels.js'
import { loadRepoContext } from '../adapters/github/templates.js'
import { makeLLMPort } from '../adapters/llm/factory.js'
import { format } from '../core/format/markdown.js'
import { formatPr } from '../core/format/pr-markdown.js'
import { score } from '../core/index.js'
import { adjudicate } from '../core/llm/adjudicate.js'
import { adjudicatePr } from '../core/llm/adjudicate-pr.js'
import { DailyCapAdapter } from '../core/llm/cap.js'
import { scorePr } from '../core/pr/score.js'
import { prVerdictBand } from '../core/pr/verdict.js'
import type { Issue } from '../core/types.js'
import { writePrSummary, writeSkipSummary, writeSummary } from './summary.js'

function parsePositiveInt(raw: string, fallback: number): number {
  const v = parseInt(raw, 10)
  return Number.isFinite(v) && v > 0 ? v : fallback
}

function labelNames(labels: unknown): string[] {
  if (!Array.isArray(labels)) return []
  return labels
    .map((l: { name?: string } | string) =>
      typeof l === 'string' ? l : typeof l?.name === 'string' ? l.name : '',
    )
    .filter((s: string) => s.length > 0)
}

export async function run(): Promise<void> {
  if (process.env.ANTHROPIC_API_KEY) core.setSecret(process.env.ANTHROPIC_API_KEY)
  if (process.env.OPENAI_API_KEY) core.setSecret(process.env.OPENAI_API_KEY)

  if (github.context.actor.endsWith('[bot]')) {
    core.info(`Skipping — triggered by bot actor: ${github.context.actor}`)
    return
  }

  const payload = github.context.payload
  if (payload.pull_request) {
    await runPullRequest()
    return
  }
  if (payload.issue) {
    await runIssue()
    return
  }
  core.info('Skipping — not an issue or pull_request event.')
}

async function runIssue(): Promise<void> {
  const payload = github.context.payload
  if (!payload.issue) return

  const issue: Issue = {
    title: typeof payload.issue.title === 'string' ? payload.issue.title : '',
    body: typeof payload.issue.body === 'string' ? payload.issue.body : '',
    labels: labelNames(payload.issue.labels),
  }

  const dryRun = core.getBooleanInput('dry-run')
  const enableComments = core.getBooleanInput('enable-comments')
  const enableLabels = core.getBooleanInput('enable-labels')
  const labelName = core.getInput('label-name') || 'needs-info'
  const model = core.getInput('model')
  const maxBodyBytes = parsePositiveInt(core.getInput('max-body-bytes') || '10000', 10000)

  if (issue.labels.includes('slop-detector-ignore')) {
    await writeSkipSummary('slop-detector-ignore label present')
    return
  }

  const token = core.getInput('github-token') || process.env.GITHUB_TOKEN
  if (!token) throw new Error('Missing GITHUB_TOKEN — set GITHUB_TOKEN env or github-token input.')

  const octokit = github.getOctokit(token)
  const { owner, repo } = github.context.repo
  const issueNumber = payload.issue.number as number
  const defaultBranch =
    (payload.repository as { default_branch?: string } | undefined)?.default_branch ?? 'main'

  const repoContext = await loadRepoContext(octokit, owner, repo, defaultBranch)

  if (issue.body.length > maxBodyBytes) {
    issue.body = issue.body.slice(0, maxBodyBytes)
  }

  const heuristicScored = score(issue, repoContext, null)

  const llm = makeLLMPort(model, process.env)
  const cache = llm ? new RunnerCachePort() : null
  const cap = cache ? new DailyCapAdapter(cache) : null
  const repoKey = `${owner}-${repo}`
  const dedupKey = `slop-detector-verdict-${owner}-${repo}-${createHash('sha256')
    .update(`${issue.title}\n${issue.body}`)
    .digest('hex')
    .slice(0, 16)}`
  const adjudication = await adjudicate(heuristicScored, issue, repoContext, repoKey, dedupKey, {
    llm,
    cache,
    cap,
  })
  const scored = adjudication.scored
  core.info(`Slop Detector: LLM adjudication status=${adjudication.status}.`)

  const body = format(scored, repoContext)

  let commentResult: { commentId: number; action: 'created' | 'updated' } | null = null
  if (!dryRun && enableComments) {
    commentResult = await postOrUpdateComment(octokit, owner, repo, issueNumber, body)
  }

  let labelAction: LabelAction = 'disabled'
  if (dryRun) {
    labelAction = 'dry-run'
  } else if (enableLabels) {
    await ensureLabel(
      octokit,
      owner,
      repo,
      labelName,
      '#e4e669',
      'Waiting for more information from the issue author',
    )
    if (scored.items.length > 0) {
      labelAction = await applyLabel(octokit, owner, repo, issueNumber, labelName)
    } else {
      labelAction = await removeLabel(octokit, owner, repo, issueNumber, labelName)
    }
  }

  const commentUrl =
    commentResult !== null
      ? `https://github.com/${owner}/${repo}/issues/${issueNumber}#issuecomment-${commentResult.commentId}`
      : null

  await writeSummary({ issue, issueNumber, scored, labelAction, commentUrl, repoContext, dryRun })

  await reportToDashboard({
    kind: 'issue',
    title: issue.title || `Issue #${issueNumber}`,
    repo: `${owner}/${repo}`,
    number: issueNumber,
    url: `https://github.com/${owner}/${repo}/issues/${issueNumber}`,
    score: scored.score,
    verdict: verdictFromScore(scored.score),
  })

  core.info(
    `Slop Detector: issue #${issueNumber} scored=${scored.score}, type=${scored.issueType}, ` +
      `tier=${scored.tierUsed}, items=${scored.items.length}, label=${labelAction}.`,
  )
}

async function runPullRequest(): Promise<void> {
  const payload = github.context.payload
  const prPayload = payload.pull_request
  if (!prPayload) return

  const dryRun = core.getBooleanInput('dry-run')
  const enableComments = core.getBooleanInput('enable-comments')
  const enableLabels = core.getBooleanInput('enable-labels')
  const labelName = core.getInput('pr-label-name') || 'needs-review-context'
  const model = core.getInput('model')
  const maxBodyBytes = parsePositiveInt(core.getInput('max-body-bytes') || '10000', 10000)

  const prLabels = labelNames(prPayload.labels)
  if (prLabels.includes('slop-detector-ignore')) {
    await writeSkipSummary('slop-detector-ignore label present on PR')
    return
  }

  const token = core.getInput('github-token') || process.env.GITHUB_TOKEN
  if (!token) throw new Error('Missing GITHUB_TOKEN — set GITHUB_TOKEN env or github-token input.')

  const octokit = github.getOctokit(token)
  const { owner, repo } = github.context.repo
  const prNumber = prPayload.number as number

  const prInput = await fetchPullRequest(octokit, owner, repo, prNumber)
  if (prInput.body.length > maxBodyBytes) {
    prInput.body = prInput.body.slice(0, maxBodyBytes)
  }

  let scored = scorePr(prInput)

  const llm = makeLLMPort(model, process.env)
  const cache = llm ? new RunnerCachePort() : null
  const cap = cache ? new DailyCapAdapter(cache) : null
  const repoKey = `${owner}-${repo}`
  const dedupKey = `slop-detector-pr-${owner}-${repo}-${createHash('sha256')
    .update(`${prInput.title}\n${prInput.body}`)
    .digest('hex')
    .slice(0, 16)}`
  const prAdj = await adjudicatePr(scored, prInput, repoKey, dedupKey, { llm, cache, cap, maxBodyBytes })
  scored = prAdj.scored
  core.info(`Slop Detector: PR LLM adjudication status=${prAdj.status}.`)

  const body = formatPr(scored, prInput.title)

  let commentResult: { commentId: number; action: 'created' | 'updated' } | null = null
  if (!dryRun && enableComments) {
    commentResult = await postOrUpdateComment(octokit, owner, repo, prNumber, body)
  }

  let labelAction: LabelAction = 'disabled'
  const needsContext = scored.missing.length > 0 || scored.score <= 3
  if (dryRun) {
    labelAction = 'dry-run'
  } else if (enableLabels) {
    await ensureLabel(
      octokit,
      owner,
      repo,
      labelName,
      '#fbca04',
      'PR description may need more reviewer context',
    )
    if (needsContext) {
      labelAction = await applyLabel(octokit, owner, repo, prNumber, labelName)
    } else {
      labelAction = await removeLabel(octokit, owner, repo, prNumber, labelName)
    }
  }

  const commentUrl =
    commentResult !== null
      ? `https://github.com/${owner}/${repo}/pull/${prNumber}#issuecomment-${commentResult.commentId}`
      : null

  await writePrSummary({
    prNumber,
    title: prInput.title,
    scored,
    labelAction,
    commentUrl,
    dryRun,
    band: prVerdictBand(scored.score),
  })

  await reportToDashboard({
    kind: 'pr',
    title: prInput.title || `PR #${prNumber}`,
    repo: `${owner}/${repo}`,
    number: prNumber,
    url: `https://github.com/${owner}/${repo}/pull/${prNumber}`,
    score: scored.score,
    verdict: scored.score <= 3 ? 'slop' : scored.score <= 6 ? 'gray' : 'clean',
  })

  core.info(
    `Slop Detector: PR #${prNumber} scored=${scored.score}, missing=${scored.missing.length}, label=${labelAction}.`,
  )
}
