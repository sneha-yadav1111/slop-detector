// Gray-zone PR adjudication (BYOK). Never asks "is this AI?" — refines density score only.

import type { CachePort } from '../../adapters/cache/port.js'
import type { PrScored } from '../pr/types.js'
import type { PullRequestInput } from '../pr/types.js'
import type { CapPort } from './cap.js'
import { mergePrVerdict } from './merge-pr.js'
import type { LLMPort, LLMVerdict, PrLLMRequest } from './port.js'

export type PrAdjudicationStatus =
  | 'merged'
  | 'skipped-not-gray-zone'
  | 'skipped-no-llm'
  | 'skipped-cap-exceeded'
  | 'dedup-hit'
  | 'failed'

export interface PrAdjudicationResult {
  scored: PrScored
  verdict: LLMVerdict | null
  status: PrAdjudicationStatus
}

export interface PrAdjudicateContext {
  llm: LLMPort | null
  cache: CachePort | null
  cap: CapPort | null
  maxBodyBytes?: number
}

function isValidVerdict(x: unknown): x is LLMVerdict {
  if (typeof x !== 'object' || x === null) return false
  const o = x as Record<string, unknown>
  return (
    typeof o.score === 'number' &&
    typeof o.rationale === 'string' &&
    Array.isArray(o.missing) &&
    o.missing.every((m) => typeof m === 'string')
  )
}

export async function adjudicatePr(
  scored: PrScored,
  pr: PullRequestInput,
  repoKey: string,
  dedupKey: string,
  ctx: PrAdjudicateContext,
): Promise<PrAdjudicationResult> {
  if (!scored.isGrayZone) {
    return { scored, verdict: null, status: 'skipped-not-gray-zone' }
  }
  if (!ctx.llm?.adjudicatePr) {
    return { scored, verdict: null, status: 'skipped-no-llm' }
  }

  if (ctx.cache) {
    try {
      const raw = await ctx.cache.get(dedupKey)
      if (raw) {
        const parsed = JSON.parse(raw) as unknown
        if (isValidVerdict(parsed)) {
          return { scored: mergePrVerdict(scored, parsed), verdict: parsed, status: 'dedup-hit' }
        }
      }
    } catch {
      /* cache miss */
    }
  }

  if (ctx.cap) {
    let exceeded = false
    try {
      exceeded = await ctx.cap.isExceeded(repoKey)
    } catch {
      exceeded = false
    }
    if (exceeded) {
      return { scored, verdict: null, status: 'skipped-cap-exceeded' }
    }
  }

  const req: PrLLMRequest = {
    pr,
    signals: scored.signals,
    findings: scored.findings,
    maxBodyBytes: ctx.maxBodyBytes,
  }

  try {
    const verdict = await ctx.llm.adjudicatePr(req)
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
        /* non-fatal */
      }
    }
    return { scored: mergePrVerdict(scored, verdict), verdict, status: 'merged' }
  } catch {
    return { scored, verdict: null, status: 'failed' }
  }
}
