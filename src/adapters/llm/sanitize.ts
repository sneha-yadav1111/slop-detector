// src/adapters/llm/sanitize.ts
// LLM-05: pure sanitization of LLM-authored strings before insertion into
// (a) the public comment body (sanitizeMissingItem — comment-bound items)
// (b) core.summary markdown (sanitizeSummaryRationale — workflow-log-bound rationale).
//
// Patterns chosen for the BYOK/prompt-injection threat model. NO DOM dep —
// sanitize-html / dompurify pull jsdom/htmlparser2 (~300KB-1MB bundled) for at most
// 5 strings × ≤120 chars per call. Regex pipeline is the right shape.

const PATTERNS = [
  /<\/?ISSUE>/gi, // boundary token leak (LLM-03)
  /<\/?CONTRIB>/gi, // Tier-3 boundary token leak
  /<\/?[a-z][^>]*>/gi, // any HTML tag
  /(?:```[\s\S]*?```)/g, // fenced code blocks
  /(?:`[^`\n]+`)/g, // inline code
] as const

export function sanitizeMissingItem(raw: string): string {
  let s = raw
  for (const re of PATTERNS) s = s.replace(re, ' ')
  // Neutralize @mentions: wrap in backticks so GitHub doesn't notify the user
  s = s.replace(/@([a-zA-Z0-9_-]+)/g, '`@$1`')
  // Strip leading list/quote markers the LLM might prepend
  s = s.replace(/^[\s>*-]+/, '')
  return s.trim().slice(0, 120) // hard cap matches zod schema max(120)
}

export function sanitizeSummaryRationale(raw: string): string {
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, ' ')
    .replace(/[\r\n]+/g, ' ')
    .slice(0, 200)
}
