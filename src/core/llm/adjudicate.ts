// src/core/llm/adjudicate.ts
// LLM-02 + LLM-04 + LLM-07 + LLM-08 + D-04 + D-11 + D-13 + D-14:
// Async helper called from src/action/main.ts AFTER the synchronous score().
// score() stays sync; this is where the LLM I/O lives, behind injected ports.
//
// CRITICAL: This file MUST NOT import from @octokit, @actions, fs, https, or any LLM SDK.
//
// Unified fallback (D-04): every non-happy code path returns the input ScoredIssue
// unchanged. This guarantees the hero-output invariant — the comment body is byte
// identical whether the LLM ran, was skipped, was capped, was deduped, was disabled,
// or threw. Status is captured separately for core.summary() / workflow logs only.

import type { CachePort } from '../../adapters/cache/port.js'
import type { Issue, RepoContext, ScoredIssue } from '../types.js'
import type { CapPort } from './cap.js'
import { mergeVerdict } from './merge.js'
import type { LLMPort, LLMRequest, LLMVerdict } from './port.js'

export type AdjudicationStatus =
  | 'merged'
  | 'skipped-not-gray-zone'
  | 'skipped-no-llm'
  | 'skipped-cap-exceeded'
  | 'dedup-hit'
  | 'failed'

export interface AdjudicateContext {
  llm: LLMPort | null
  cache: CachePort | null
  cap: CapPort | null
  /** Used to build the LLMRequest body window. Default 6144 bytes. Truncation by bytes upstream. */
  truncatedBodyBytes?: number
}

export interface AdjudicationResult {
  scored: ScoredIssue
  verdict: LLMVerdict | null
  status: AdjudicationStatus
}

function isValidVerdictShape(x: unknown): x is LLMVerdict {
  if (typeof x !== 'object' || x === null) return false
  const o = x as Record<string, unknown>
  return (
    typeof o.score === 'number' &&
    typeof o.rationale === 'string' &&
    Array.isArray(o.missing) &&
    o.missing.every((m) => typeof m === 'string')
  )
}

export async function adjudicate(
  scored: ScoredIssue,
  issue: Issue,
  repoContext: RepoContext,
  repoKey: string,
  dedupKey: string,
  ctx: AdjudicateContext,
): Promise<AdjudicationResult> {
  // LLM-02 gating — clear-cut issues never call the LLM (D-01 invariant)
  if (!scored.isGrayZone) {
    return { scored, verdict: null, status: 'skipped-not-gray-zone' }
  }
  // LLM-08 no-LLM — silent default for heuristics-only installs
  if (!ctx.llm) {
    return { scored, verdict: null, status: 'skipped-no-llm' }
  }

  // D-14 dedup cache check (BEFORE cap — a cache hit costs nothing and should not
  // be blocked by the per-day cap)
  if (ctx.cache) {
    let raw: string | null = null
    try {
      raw = await ctx.cache.get(dedupKey)
    } catch {
      // CachePort contract says get() never throws; defensive nonetheless.
      raw = null
    }
    if (raw) {
      try {
        const parsed: unknown = JSON.parse(raw)
        if (isValidVerdictShape(parsed)) {
          return {
            scored: mergeVerdict(scored, parsed),
            verdict: parsed,
            status: 'dedup-hit',
          }
        }
        // wrong-shape value → fall through to LLM call (treat as miss, T-04-08)
      } catch {
        // malformed JSON in cache → fall through to LLM call (treat as miss, T-04-08)
      }
    }
  }

  // D-11 daily cap
  if (ctx.cap) {
    let exceeded = false
    try {
      exceeded = await ctx.cap.isExceeded(repoKey)
    } catch {
      // CapPort failures are silent → assume not exceeded; the call may still hit the
      // adapter's own retry/throttle. Best-effort cap.
      exceeded = false
    }
    if (exceeded) {
      return { scored, verdict: null, status: 'skipped-cap-exceeded' }
    }
  }

  // LLM call — D-04 unified fallback on ANY throw
  const req: LLMRequest = { issue, signals: scored.signals, repoContext }
  let verdict: LLMVerdict
  try {
    verdict = await ctx.llm.adjudicate(req)
  } catch {
    return { scored, verdict: null, status: 'failed' }
  }

  // Defensive shape check (adapter already validated, but D-04 trust-but-verify)
  if (!isValidVerdictShape(verdict)) {
    return { scored, verdict: null, status: 'failed' }
  }

  // Record success: bump cap and store dedup cache (both best-effort — silent failure
  // does NOT downgrade status; T-04-11 mitigation)
  if (ctx.cap) {
    try {
      await ctx.cap.recordCall(repoKey)
    } catch {
      /* silent */
    }
  }
  if (ctx.cache) {
    try {
      await ctx.cache.set(dedupKey, JSON.stringify(verdict))
    } catch {
      /* silent */
    }
  }

  return { scored: mergeVerdict(scored, verdict), verdict, status: 'merged' }
}
