// Web-layer shared types for scan requests/results.
import type { CommentScanResult } from '@core/comments/types'
import type { PrScored } from '@core/pr/types'
import type { ScoredIssue } from '@core/types'

export type ScanKind = 'issue' | 'pr' | 'code'
export type ScanSource = 'github' | 'paste' | 'fixture'

/** Coarse verdict shared by all artifact kinds. */
export type Verdict = 'slop' | 'gray' | 'clean'

export interface IssueScanResult {
  kind: 'issue'
  source: ScanSource
  scored: ScoredIssue
  /** Rendered checklist comment (markdown) the Action would post. */
  comment: string
  llmUsed: boolean
  /** 0–100, higher = more slop. */
  slopScore: number
  verdict: Verdict
  findings: string[]
}

export interface PrScanResult {
  kind: 'pr'
  source: ScanSource
  scored: PrScored
  llmUsed: boolean
  slopScore: number
  verdict: Verdict
  findings: string[]
}

export interface CodeScanResult {
  kind: 'code'
  source: ScanSource
  scored: CommentScanResult
  /** Information score 0–10 (higher = better). */
  signalScore: number
  slopScore: number
  verdict: Verdict
  findings: string[]
  suggestions: string[]
  llmUsed: false
}

export type ScanResult = (IssueScanResult | PrScanResult | CodeScanResult) & {
  meta: ScanMeta
}

export interface ScanMeta {
  title: string
  url?: string
  repo?: string
  number?: number
  author?: string
  scannedAt: string
}

/** A row in the live activity feed. */
export interface ActivityEntry {
  id: string
  kind: ScanKind
  source: ScanSource
  title: string
  repo?: string
  number?: number
  url?: string
  score: number
  /** 0–100, higher = more slop. */
  slopScore: number
  verdict: Verdict
  scannedAt: string
}
