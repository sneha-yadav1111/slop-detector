// src/core/pr/types.ts
// Track A (Code Review) DTOs — PR / commit "slop" detection.

export interface PrReviewComment {
  path: string
  line: number
  body: string
}

export interface PullRequestInput {
  title: string
  body: string
  changedFiles?: string[]
  changedFileCount?: number
  commits?: string[]
  linesChanged?: number
  /** Semantic tokens from diff hunks (optional — improves overlap detection). */
  changedHunkTokens?: string[]
  hasTestFileChanges?: boolean
  touchesSensitivePaths?: boolean
  reviewComments?: PrReviewComment[]
}

export interface PrSignals {
  hasMotivation: boolean
  hasIssueLink: boolean
  hasTestingNotes: boolean
  isDiffRestating: boolean
  hasGenericBoilerplate: boolean
  isThin: boolean
  hasRiskNotes: boolean
  isChangelogOnly: boolean
  hasHunkOverlap: boolean
  missingTestsMention: boolean
  requiresRiskNotes: boolean
}

export interface SignalEvidence {
  triggered: boolean
  snippet?: string
}

export interface ScoreBreakdownEntry {
  signal: keyof PrSignals
  weight: number
  contribution: number
}

export interface CommitVerdict {
  message: string
  isSlop: boolean
  reasons: string[]
}

export interface PrScored {
  score: number
  isGrayZone: boolean
  signals: PrSignals
  findings: string[]
  missing: string[]
  commits: CommitVerdict[]
  commitSlopRatio: number
  /** 0–100 overlap between body and diff identifiers when hunks available. */
  diffOverlapPercent?: number
  evidence: Partial<Record<keyof PrSignals, SignalEvidence>>
  scoreBreakdown: ScoreBreakdownEntry[]
  reviewCommentFindings?: string[]
}
