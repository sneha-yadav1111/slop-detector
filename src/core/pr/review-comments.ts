// Detect hollow PR review comments (LGTM-only, ultra-short on large PRs).

import type { PrReviewComment } from './types.js'

const LGTM_RE = /^(?:lgtm|looks good(?:\s+to\s+me)?|approved?|ship it|\+1)\.?$/i

export function assessReviewComments(
  comments: PrReviewComment[] | undefined,
  linesChanged: number,
): string[] {
  if (!comments?.length) return []
  const findings: string[] = []
  const large = linesChanged >= 100

  for (const c of comments) {
    const body = c.body.trim()
    if (body.length === 0) continue
    if (LGTM_RE.test(body)) {
      findings.push(`Review comment on \`${c.path}\` is approval-only with no substance.`)
    } else if (large && body.length < 12) {
      findings.push(`Very short review comment on \`${c.path}\` for a large change.`)
    }
  }
  return findings.slice(0, 5)
}
