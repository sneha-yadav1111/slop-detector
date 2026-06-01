// src/core/llm/merge.ts
// LLM-04 + LLM-05 + D-01 + D-03: pure merge of (heuristic ScoredIssue, LLMVerdict) → ScoredIssue.
// CRITICAL: This file MUST NOT import from @octokit, @actions, fs, https, or any LLM SDK.
//
// Sanitization (LLM-05) is inlined locally to avoid a cross-plan file dependency:
// Plan 04-01 (running in parallel) ships src/adapters/llm/sanitize.ts with the canonical
// sanitizeMissingItem. To keep this plan's merge.ts self-contained AND parallel-safe, the
// identical regex pipeline is embedded as an internal helper. The patterns + behaviour MUST
// stay byte-equivalent to the Plan 04-01 sanitizeMissingItem definition; a future refactor
// will re-export the shared helper once both plans land.
//
// Deviation: Rule 3 (auto-fix blocking issue) — src/adapters/llm/sanitize.ts does not exist
// at this worktree's base commit (Plan 04-02 ran in parallel with Plan 04-01). The cross-plan
// note in 04-02-PLAN.md instructs the executor to "Import only what exists at your worktree
// base." This file therefore inlines the LLM-05 regex pipeline verbatim from 04-RESEARCH.md
// §530-547 and 04-01-PLAN.md interfaces block. Functional outcome is identical.

import { MAX_ITEMS } from '../checklist/strategies/shared.js'
import { MAX_SCORE } from '../score/weights.js'
import type { ChecklistItem, ScoredIssue } from '../types.js'
import type { LLMVerdict } from './port.js'

// LLM-05 inline sanitizer — keep byte-equivalent to src/adapters/llm/sanitize.ts (Plan 04-01).
const LLM05_PATTERNS = [
  /<\/?ISSUE>/gi,
  /<\/?CONTRIB>/gi,
  /<\/?[a-z][^>]*>/gi,
  /(?:```[\s\S]*?```)/g,
  /(?:`[^`\n]+`)/g,
] as const

function sanitizeMissingItem(raw: string): string {
  let s = raw
  for (const re of LLM05_PATTERNS) s = s.replace(re, ' ')
  // Defang @mentions — wrap in backticks so GitHub doesn't notify arbitrary users
  s = s.replace(/@([a-zA-Z0-9_-]+)/g, '`@$1`')
  // Strip leading list/quote markers the LLM might prepend
  s = s.replace(/^[\s>*-]+/, '')
  return s.trim().slice(0, 120)
}

function isDuplicate(candidate: string, existing: ChecklistItem[]): boolean {
  const c = candidate.toLowerCase()
  for (const e of existing) {
    const t = e.text.toLowerCase()
    if (c.includes(t) || t.includes(c)) return true
  }
  return false
}

export function mergeVerdict(scored: ScoredIssue, verdict: LLMVerdict): ScoredIssue {
  // D-01: unconditional score replacement in gray zone; clamp to [0..MAX_SCORE] defensively.
  const replacedScore = Math.max(0, Math.min(MAX_SCORE, Math.round(verdict.score)))

  // D-03: heuristic items first, then LLM items, deduped (case-insensitive substring),
  // sanitized via LLM-05 sanitizer, capped at MAX_ITEMS.
  const merged: ChecklistItem[] = [...scored.items]
  for (const raw of verdict.missing) {
    if (merged.length >= MAX_ITEMS) break
    const text = sanitizeMissingItem(raw)
    if (text.length === 0) continue
    if (isDuplicate(text, merged)) continue
    merged.push({ text })
  }

  return {
    ...scored,
    score: replacedScore,
    items: merged,
    missing: merged.map((i) => i.text),
    // isGrayZone, signals, issueType, tierUsed are copied unchanged from `scored` via spread
  }
}
