// Track A — PR information-density scorer.

import { assessCommits } from './commits.js'
import { extractPrSignalsDetailed } from './extractor.js'
import { assessReviewComments } from './review-comments.js'
import type { PrScored, PrSignals, PullRequestInput, ScoreBreakdownEntry } from './types.js'

const PR_WEIGHTS: Record<keyof PrSignals, number> = {
  hasMotivation: 3.0,
  hasTestingNotes: 2.0,
  hasIssueLink: 1.5,
  hasRiskNotes: 1.0,
  hasGenericBoilerplate: -1.5,
  isDiffRestating: -3.0,
  isThin: -2.5,
  isChangelogOnly: -2.0,
  hasHunkOverlap: -1.5,
  missingTestsMention: -1.0,
  requiresRiskNotes: -1.5,
}

const MAX = 10
const GRAY_LOW = 3
const GRAY_HIGH = 6

const MISSING_FOR: Partial<Record<keyof PrSignals, string>> = {
  hasMotivation: 'Why is this change needed? (the problem it solves or the context)',
  hasTestingNotes: 'How was this verified? (tests added, manual steps, or screenshots)',
  hasIssueLink: 'A linked issue or ticket this PR addresses',
  hasRiskNotes: 'Any risks, trade-offs, or follow-ups reviewers should know about',
  missingTestsMention: 'How test files were exercised or what was verified',
  requiresRiskNotes: 'Risks or trade-offs for security/auth/migration changes',
}

export function scorePr(pr: PullRequestInput): PrScored {
  const { signals, evidence, diffOverlapPercent } = extractPrSignalsDetailed(pr)

  let raw = 5
  const scoreBreakdown: ScoreBreakdownEntry[] = []
  for (const [key, weight] of Object.entries(PR_WEIGHTS) as Array<[keyof PrSignals, number]>) {
    const triggered = signals[key]
    const contribution = triggered ? weight : 0
    if (triggered) raw += weight
    scoreBreakdown.push({ signal: key, weight, contribution })
  }

  if (signals.isChangelogOnly) raw -= 1
  const score = Math.max(0, Math.min(MAX, Math.round(raw)))
  const isGrayZone = score >= GRAY_LOW && score <= GRAY_HIGH

  const findings: string[] = []
  if (signals.isChangelogOnly)
    findings.push('Reads like a changelog or file list without reviewer-useful context.')
  if (signals.isDiffRestating)
    findings.push('Description mostly restates the diff without adding reviewer-useful context.')
  if (signals.hasHunkOverlap && !signals.isDiffRestating)
    findings.push('Body overlaps heavily with identifiers from the code diff.')
  if (signals.isThin) findings.push('Description is thin relative to the size of the change.')
  if (signals.hasGenericBoilerplate)
    findings.push(
      'Uses generic AI-PR boilerplate phrasing ("This PR introduces…", file-list bullets).',
    )
  if (signals.missingTestsMention)
    findings.push('Test files changed but the description does not mention verification.')
  if (signals.requiresRiskNotes)
    findings.push('Touches sensitive paths but does not discuss risks or trade-offs.')
  if (signals.hasMotivation) findings.push('Explains the motivation / problem behind the change.')
  if (signals.hasTestingNotes) findings.push('Includes testing or verification notes.')
  if (signals.hasIssueLink) findings.push('Links to a related issue or ticket.')
  if (signals.hasRiskNotes) findings.push('Calls out risks, trade-offs, or follow-ups.')

  const missing: string[] = []
  for (const [key, text] of Object.entries(MISSING_FOR) as Array<[keyof PrSignals, string]>) {
    if (key === 'hasMotivation' || key === 'hasTestingNotes' || key === 'hasIssueLink' || key === 'hasRiskNotes') {
      if (!signals[key]) missing.push(text)
    } else if (signals[key]) {
      missing.push(text)
    }
  }

  const commits = assessCommits(pr.commits ?? [])
  const slopCount = commits.filter((c) => c.isSlop).length
  const commitSlopRatio = commits.length > 0 ? slopCount / commits.length : 0

  const reviewCommentFindings = assessReviewComments(pr.reviewComments, pr.linesChanged ?? 0)

  return {
    score,
    isGrayZone,
    signals,
    findings,
    missing,
    commits,
    commitSlopRatio,
    diffOverlapPercent,
    evidence,
    scoreBreakdown,
    reviewCommentFindings,
  }
}
