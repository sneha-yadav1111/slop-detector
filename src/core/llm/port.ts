import type { PrSignals } from '../pr/types.js'
import type { PullRequestInput } from '../pr/types.js'
import type { ChecklistItem, Issue, RepoContext, Signals } from '../types.js'

export interface LLMRequest {
  issue: Issue
  signals: Signals
  repoContext: RepoContext
}

export interface LLMVerdict {
  score: number
  rationale: string
  missing: string[]
}

// Phase 4 (CHECK-05): Tier-3 CONTRIBUTING.md → ChecklistItem[] extraction request.
// Consumed by concrete adapters in src/adapters/llm/; core never imports an LLM SDK.
export interface Tier3ExtractRequest {
  contributingMd: string
  issueType: 'bug' | 'feature' | 'question'
}

export interface PrLLMRequest {
  pr: PullRequestInput
  signals: PrSignals
  findings: string[]
  maxBodyBytes?: number
}

export interface LLMPort {
  adjudicate(req: LLMRequest): Promise<LLMVerdict>
  /** Optional — PR gray-zone refinement (Track A). */
  adjudicatePr?(req: PrLLMRequest): Promise<LLMVerdict>
  extractChecklistFromContributing(req: Tier3ExtractRequest): Promise<ChecklistItem[]>
}
