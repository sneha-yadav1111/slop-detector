// Merge LLM verdict into PrScored (gray-zone PR adjudication).

import type { PrScored } from '../pr/types.js'
import type { LLMVerdict } from './port.js'

const LLM05_PATTERNS = [
  /<\/?PR>/gi,
  /<\/?[a-z][^>]*>/gi,
  /(?:```[\s\S]*?```)/g,
] as const

function sanitize(s: string): string {
  let t = s
  for (const re of LLM05_PATTERNS) t = t.replace(re, ' ')
  return t.trim().slice(0, 120)
}

export function mergePrVerdict(scored: PrScored, verdict: LLMVerdict): PrScored {
  const score = Math.max(0, Math.min(10, Math.round(verdict.score)))
  const missing = [...scored.missing]
  for (const raw of verdict.missing) {
    const text = sanitize(raw)
    if (!text) continue
    if (missing.some((m) => m.toLowerCase().includes(text.toLowerCase()))) continue
    if (missing.length >= 8) break
    missing.push(text)
  }
  return {
    ...scored,
    score,
    isGrayZone: score >= 3 && score <= 6,
    missing,
    findings: [...scored.findings, `LLM note: ${verdict.rationale.slice(0, 200)}`],
  }
}
