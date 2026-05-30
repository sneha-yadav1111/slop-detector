// Server-side scan orchestration: GitHub fetch (or paste) -> core scoring ->
// optional LLM adjudication -> rendered result + activity record.

import { analyze, verdictFromSignal } from '@core/analyze'
import { scanComments } from '@core/comments/index'
import { format } from '@core/format/markdown'
import { score as scoreIssue } from '@core/index'
import { scorePr } from '@core/pr/score'
import type { Issue, RepoContext } from '@core/types'
import { recordActivity, verdictFor } from './activity'
import { fetchIssue, fetchPrWithProgress, parseGitHubRef } from './github'
import type { CodeScanResult, IssueScanResult, PrScanResult, ScanResult, ScanSource } from './types'

export type ProgressEvent = { type: string; message: string }
export type OnProgress = (event: ProgressEvent) => void

function toSlopScore(signalScore: number): number {
  return Math.round((10 - Math.max(0, Math.min(10, signalScore))) * 10)
}

const EMPTY_REPO_CTX: RepoContext = {
  hasIssueForms: false,
  hasMdTemplates: false,
  hasContributing: false,
  templates: [],
}

function llmAvailable(): boolean {
  return Boolean(
    process.env.DEMO_MODE === 'true' ||
      process.env.ANTHROPIC_API_KEY ||
      process.env.OPENAI_API_KEY ||
      process.env.OPENROUTER_API_KEY ||
      process.env.GEMINI_API_KEY,
  )
}

async function maybeAdjudicatePr(
  scored: ReturnType<typeof scorePr>,
  pr: { title: string; body: string },
): Promise<{ scored: ReturnType<typeof scorePr>; llmUsed: boolean }> {
  if (!scored.isGrayZone || !llmAvailable()) return { scored, llmUsed: false }
  const { makeLLMPort } = await import('@adapters/llm/factory')
  const llm = makeLLMPort(process.env.SLOP_DETECTOR_MODEL ?? '', process.env)
  if (!llm?.adjudicatePr) return { scored, llmUsed: false }
  try {
    const { adjudicatePr } = await import('@core/llm/adjudicate-pr')
    const result = await adjudicatePr(
      scored,
      { title: pr.title, body: pr.body },
      'web',
      `web-pr-${Date.now()}`,
      { llm, cache: null, cap: null },
    )
    return { scored: result.scored, llmUsed: result.status === 'merged' }
  } catch {
    return { scored, llmUsed: false }
  }
}

async function maybeAdjudicateIssue(
  scored: ReturnType<typeof scoreIssue>,
  issue: Issue,
): Promise<{ scored: ReturnType<typeof scoreIssue>; llmUsed: boolean }> {
  if (!scored.isGrayZone || !llmAvailable()) return { scored, llmUsed: false }
  // Lazy-load the LLM factory (and its SDKs) only when a key is actually present,
  // so the default heuristics-only path never bundles the provider SDKs.
  const { makeLLMPort } = await import('@adapters/llm/factory')
  const llm = makeLLMPort(process.env.SLOP_DETECTOR_MODEL ?? '', process.env)
  if (!llm) return { scored, llmUsed: false }
  try {
    const verdict = await llm.adjudicate({
      issue,
      signals: scored.signals,
      repoContext: EMPTY_REPO_CTX,
    })
    const merged = {
      ...scored,
      score: Math.max(0, Math.min(10, Math.round(verdict.score))),
      missing: verdict.missing.length > 0 ? verdict.missing : scored.missing,
      items: verdict.missing.length > 0 ? verdict.missing.map((text) => ({ text })) : scored.items,
    }
    return { scored: merged, llmUsed: true }
  } catch {
    return { scored, llmUsed: false }
  }
}

/** Scan a GitHub issue or PR by URL/shorthand. */
export async function scanGitHub(ref: string, onProgress?: OnProgress): Promise<ScanResult> {
  onProgress?.({ type: 'init', message: 'Parsing GitHub reference...' })
  const parsed = parseGitHubRef(ref)
  if (!parsed) throw new Error('Could not parse a GitHub issue/PR URL from the input.')

  if (parsed.kind === 'pr') {
    onProgress?.({
      type: 'fetch',
      message: `Fetching pull request ${parsed.owner}/${parsed.repo}#${parsed.number}...`,
    })
    const pr = await fetchPrWithProgress(
      parsed.owner,
      parsed.repo,
      parsed.number,
      (step, message) => {
        onProgress?.({ type: step, message })
      },
    )
    onProgress?.({
      type: 'analyze',
      message: 'Running heuristics engine on PR commits and description...',
    })
    let scored = scorePr(pr)
    const { scored: adj, llmUsed } = await maybeAdjudicatePr(scored, pr)
    scored = adj
    onProgress?.({ type: 'done', message: 'Finalizing report...' })
    return finishPr(
      scored,
      'github',
      {
        title: pr.title,
        url: pr.url,
        repo: `${parsed.owner}/${parsed.repo}`,
        number: parsed.number,
        author: pr.author,
      },
      llmUsed,
    )
  }

  onProgress?.({
    type: 'fetch',
    message: `Fetching issue ${parsed.owner}/${parsed.repo}#${parsed.number}...`,
  })
  const fi = await fetchIssue(parsed.owner, parsed.repo, parsed.number)
  const issue: Issue = { title: fi.title, body: fi.body, labels: fi.labels }

  onProgress?.({ type: 'analyze', message: 'Running heuristics engine on issue text...' })
  const base = scoreIssue(issue, EMPTY_REPO_CTX)

  onProgress?.({ type: 'llm', message: 'Consulting LLM for gray zone adjudication...' })
  const { scored, llmUsed } = await maybeAdjudicateIssue(base, issue)

  onProgress?.({ type: 'done', message: 'Finalizing report...' })
  return finishIssue(scored, issue, 'github', llmUsed, {
    title: fi.title,
    url: fi.url,
    repo: `${parsed.owner}/${parsed.repo}`,
    number: parsed.number,
    author: fi.author,
  })
}

/** Scan pasted free-text content. */
export async function scanPaste(
  kind: 'issue' | 'pr',
  title: string,
  body: string,
  source: ScanSource = 'paste',
  onProgress?: OnProgress,
): Promise<ScanResult> {
  onProgress?.({ type: 'init', message: 'Analyzing pasted content...' })
  if (kind === 'pr') {
    const scored = scorePr({ title, body })
    onProgress?.({ type: 'done', message: 'Finalizing report...' })
    return finishPr(scored, source, { title: title || 'Pasted PR', author: 'you' })
  }
  const issue: Issue = { title, body, labels: [] }
  onProgress?.({ type: 'analyze', message: 'Running heuristics engine...' })
  const base = scoreIssue(issue, EMPTY_REPO_CTX)
  onProgress?.({ type: 'llm', message: 'Consulting LLM for gray zone adjudication...' })
  const { scored, llmUsed } = await maybeAdjudicateIssue(base, issue)
  onProgress?.({ type: 'done', message: 'Finalizing report...' })
  return finishIssue(scored, issue, source, llmUsed, {
    title: title || 'Pasted issue',
    author: 'you',
  })
}

function finishIssue(
  scored: ReturnType<typeof scoreIssue>,
  _issue: Issue,
  source: ScanSource,
  llmUsed: boolean,
  meta: { title: string; url?: string; repo?: string; number?: number; author?: string },
): IssueScanResult & { meta: ScanResult['meta'] } {
  const comment = format(scored, EMPTY_REPO_CTX)
  const unified = analyze({ kind: 'issue', issue: { title: meta.title, body: '', labels: [] } })
  const result: IssueScanResult & { meta: ScanResult['meta'] } = {
    kind: 'issue',
    source,
    scored,
    comment,
    llmUsed,
    slopScore: toSlopScore(scored.score),
    verdict: verdictFor('issue', scored.score),
    findings: unified.findings,
    meta: { ...meta, scannedAt: new Date().toISOString() },
  }
  record(result)
  return result
}

function finishPr(
  scored: ReturnType<typeof scorePr>,
  source: ScanSource,
  meta: { title: string; url?: string; repo?: string; number?: number; author?: string },
  llmUsed = false,
): PrScanResult & { meta: ScanResult['meta'] } {
  const findings = [...scored.findings]
  const slopCommits = scored.commits.filter((c) => c.isSlop)
  if (slopCommits.length > 0) {
    findings.push(
      `${slopCommits.length}/${scored.commits.length} commit messages are generic filler.`,
    )
  }
  const result: PrScanResult & { meta: ScanResult['meta'] } = {
    kind: 'pr',
    source,
    scored,
    llmUsed,
    slopScore: toSlopScore(scored.score),
    verdict: verdictFor('pr', scored.score),
    findings,
    meta: { ...meta, scannedAt: new Date().toISOString() },
  }
  record(result)
  return result
}

/** Scan a blob of source code for hollow comments. */
export function scanCode(
  source: string,
  title = 'Pasted code',
  scanSource: ScanSource = 'paste',
  onProgress?: OnProgress,
): CodeScanResult & { meta: ScanResult['meta'] } {
  onProgress?.({ type: 'init', message: 'Analyzing source code...' })
  const unified = analyze({ kind: 'comments', source })
  const scored = scanComments(source)
  onProgress?.({ type: 'done', message: 'Finalizing report...' })
  const result: CodeScanResult & { meta: ScanResult['meta'] } = {
    kind: 'code',
    source: scanSource,
    scored,
    signalScore: unified.signalScore,
    slopScore: unified.slopScore,
    verdict:
      verdictFromSignal(unified.signalScore) === 'clean'
        ? 'clean'
        : verdictFromSignal(unified.signalScore) === 'slop'
          ? 'slop'
          : 'gray',
    findings: unified.findings,
    suggestions: unified.suggestions,
    llmUsed: false,
    meta: { title, scannedAt: new Date().toISOString() },
  }
  record(result)
  return result
}

function record(result: ScanResult): void {
  const score = result.kind === 'code' ? result.signalScore : result.scored.score
  recordActivity({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind: result.kind,
    source: result.source,
    title: result.meta.title,
    repo: result.meta.repo,
    number: result.meta.number,
    url: result.meta.url,
    score,
    slopScore: result.slopScore,
    verdict: result.verdict,
    scannedAt: result.meta.scannedAt,
  })
}

export { llmAvailable }
