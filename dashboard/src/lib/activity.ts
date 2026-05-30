// In-memory activity feed (process-scoped). Survives across requests within one
// server instance — perfect for a live demo. Not persisted (intentional for v1).

import type { ActivityEntry } from './types'

const MAX = 50
const g = globalThis as unknown as { __signalOssActivity?: ActivityEntry[] }
if (!g.__signalOssActivity) g.__signalOssActivity = []

export function recordActivity(entry: ActivityEntry): void {
  const list = g.__signalOssActivity as ActivityEntry[]
  list.unshift(entry)
  if (list.length > MAX) list.length = MAX
}

export function getActivity(): ActivityEntry[] {
  return [...(g.__signalOssActivity as ActivityEntry[])]
}

export function verdictFor(kind: 'issue' | 'pr', score: number): ActivityEntry['verdict'] {
  // PR density gray zone 3–6, issue gray zone 3–5.
  const grayHigh = kind === 'pr' ? 6 : 5
  if (score <= 2) return 'slop'
  if (score <= grayHigh) return 'gray'
  return 'clean'
}
