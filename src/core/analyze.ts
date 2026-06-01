// src/core/analyze.ts
// Cross-Track unified detection engine (Slop Scan bonus: "Cross-Track Scanner").
//
// One entrypoint, one normalized verdict shape, three detectors behind it:
//   - 'pr'      → PR description information-density + commit slop  (Track A)
//   - 'comments'→ hollow code-comment detection                    (Track A)
//   - 'issue'   → issue actionability / missing-info                (supporting)
//
// Every detector ultimately produces a 0–10 "signal score" (higher = more
// genuine information) which we invert into a 0–100 slop score for a single,
// comparable scale across artifact kinds. The verdict label is derived from
// fixed thresholds so the UI, the Action summary, and the benchmark all agree.
//
// Pure module: NO octokit / fs / LLM imports.

import { scanComments } from './comments/index.js'
import type { CommentScanResult } from './comments/types.js'
import { scorePr } from './pr/score.js'
import type { PrScored, PullRequestInput } from './pr/types.js'
import { score as scoreIssue } from './score-issue.js'
import type { Issue, RepoContext, ScoredIssue } from './types.js'

export type ArtifactKind = 'pr' | 'commit' | 'comments' | 'issue'

/** Coarse verdict label shared by every artifact kind. */
export type SlopVerdict = 'clean' | 'gray-zone' | 'slop'

export interface UnifiedResult {
  kind: ArtifactKind
  /** 0–100, higher = more slop. (100 − 10×signalScore.) */
  slopScore: number
  /** The underlying 0–10 information/quality score (higher = better). */
  signalScore: number
  verdict: SlopVerdict
  /** True when the score sits in the uncertain middle band. */
  isGrayZone: boolean
  /** Concrete findings a human reviewer would have raised. */
  findings: string[]
  /** What the artifact should add to stop being slop. */
  suggestions: string[]
  /** Detector-specific payload for richer UIs (PR signals, comment verdicts, etc.). */
  detail: PrScored | ScoredIssue | CommentScanResult
}

const EMPTY_REPO_CTX: RepoContext = {
  hasIssueForms: false,
  hasMdTemplates: false,
  hasContributing: false,
  templates: [],
}

/** Map a 0–10 quality score to a coarse verdict using shared thresholds. */
export function verdictFromSignal(signalScore: number): SlopVerdict {
  if (signalScore <= 3) return 'slop'
  if (signalScore <= 6) return 'gray-zone'
  return 'clean'
}

function toSlopScore(signalScore: number): number {
  return Math.round((10 - Math.max(0, Math.min(10, signalScore))) * 10)
}

export interface AnalyzeInput {
  kind: ArtifactKind
  /** For 'pr' / 'commit' / 'issue'. */
  pr?: PullRequestInput
  issue?: Issue
  repoContext?: RepoContext
  /** For 'comments': raw source code. */
  source?: string
}

/**
 * Unified analysis entrypoint. Returns a normalized {@link UnifiedResult} for any
 * supported artifact kind. The same function powers the web dashboard, the Action
 * summary, and the benchmark harness — so published numbers reflect the real path.
 */
export function analyze(input: AnalyzeInput): UnifiedResult {
  switch (input.kind) {
    case 'pr':
    case 'commit':
      return analyzePr(input.pr ?? { title: '', body: '' }, input.kind)
    case 'comments':
      return analyzeComments(input.source ?? '')
    case 'issue':
      return analyzeIssue(input.issue ?? { title: '', body: '', labels: [] }, input.repoContext)
  }
}

function analyzePr(pr: PullRequestInput, kind: 'pr' | 'commit'): UnifiedResult {
  const scored = scorePr(pr)
  const findings = [...scored.findings]
  const suggestions = [...scored.missing]

  const slopCommits = scored.commits.filter((c) => c.isSlop)
  if (slopCommits.length > 0) {
    findings.push(
      `${slopCommits.length}/${scored.commits.length} commit messages are generic filler ` +
        `(e.g. "${slopCommits[0]?.message}").`,
    )
  }

  return {
    kind,
    slopScore: toSlopScore(scored.score),
    signalScore: scored.score,
    verdict: verdictFromSignal(scored.score),
    isGrayZone: scored.isGrayZone,
    findings,
    suggestions,
    detail: scored,
  }
}

function analyzeComments(source: string): UnifiedResult {
  const scan = scanComments(source)
  // Quality score: full marks when no hollow comments; drops with the slop ratio.
  // A file with zero comments is neutral (7/10) — absence of comments is not slop.
  const signalScore = scan.total === 0 ? 7 : Math.round((1 - scan.slopRatio) * 10)

  const findings: string[] = []
  const byReason = new Map<string, number>()
  for (const v of scan.verdicts) {
    if (!v.isSlop) continue
    for (const r of v.reasons) byReason.set(r, (byReason.get(r) ?? 0) + 1)
  }
  for (const [reason, count] of byReason) {
    findings.push(`${count} ${reasonLabel(reason)} comment${count > 1 ? 's' : ''}.`)
  }
  if (scan.slopCount > 0) {
    const first = scan.verdicts.find((v) => v.isSlop)
    if (first) findings.push(`First flagged (line ${first.line}): "${first.text}".`)
  }

  const suggestions =
    scan.slopCount > 0
      ? [
          'Remove comments that restate the code; keep only those that explain WHY.',
          'Replace generic "This function …" docstrings with the specific contract (inputs, edge cases, invariants).',
        ]
      : []

  return {
    kind: 'comments',
    slopScore: toSlopScore(signalScore),
    signalScore,
    verdict: verdictFromSignal(signalScore),
    isGrayZone: signalScore >= 4 && signalScore <= 6,
    findings,
    suggestions,
    detail: scan,
  }
}

function analyzeIssue(issue: Issue, ctx?: RepoContext): UnifiedResult {
  const scored = scoreIssue(issue, ctx ?? EMPTY_REPO_CTX)
  return {
    kind: 'issue',
    slopScore: toSlopScore(scored.score),
    signalScore: scored.score,
    verdict: verdictFromSignal(scored.score),
    isGrayZone: scored.isGrayZone,
    findings: scored.signals ? describeIssueSignals(scored) : [],
    suggestions: scored.missing,
    detail: scored,
  }
}

function describeIssueSignals(scored: ScoredIssue): string[] {
  const s = scored.signals
  const out: string[] = []
  if (s.hasStackTrace) out.push('Includes a stack trace.')
  if (s.hasCodeBlock) out.push('Includes a code block.')
  if (s.hasReproKeywords) out.push('Has reproduction steps.')
  if (s.hasVersionMention) out.push('Mentions version / environment.')
  if (s.hasImageOnly) out.push('Image with no accompanying text (low signal).')
  out.push(`Classified as: ${scored.issueType}.`)
  return out
}

function reasonLabel(reason: string): string {
  switch (reason) {
    case 'restates-code':
      return 'code-restating'
    case 'states-obvious':
      return 'states-the-obvious'
    case 'ai-boilerplate':
      return 'AI-boilerplate'
    case 'tautology':
      return 'tautological'
    case 'empty-or-marker':
      return 'empty-marker'
    default:
      return reason
  }
}
