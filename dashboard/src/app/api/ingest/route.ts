// Optional Action → dashboard ingest endpoint.
//
// The GitHub Action can POST a scan result here to surface real, live triage runs
// in the dashboard's activity feed. This is entirely OPTIONAL:
//   - If SLOP_DETECTOR_INGEST_TOKEN is unset, the endpoint is disabled (404-equivalent)
//     and the Action simply skips posting — nothing breaks.
//   - If set, the Action must send a matching `x-slop-detector-token` header.
//
// Storage reuses the same in-memory activity store as on-demand scans, so the
// dashboard shows both seamlessly. (For multi-instance persistence, swap the
// store for Vercel KV — see lib/activity.ts.)

import { NextResponse } from 'next/server'
import { recordActivity } from '@/lib/activity'
import type { ActivityEntry, ScanKind, Verdict } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface IngestBody {
  kind: ScanKind
  title: string
  repo?: string
  number?: number
  url?: string
  /** Information/quality score 0–10. */
  score: number
  /** Slop score 0–100 (optional — derived from score if absent). */
  slopScore?: number
  verdict: Verdict
}

function authorized(req: Request): boolean {
  const expected = process.env.SLOP_DETECTOR_INGEST_TOKEN
  if (!expected) return false // disabled when no token configured
  return req.headers.get('x-slop-detector-token') === expected
}

export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Ingest disabled or unauthorized.' }, { status: 401 })
  }

  let body: IngestBody
  try {
    body = (await req.json()) as IngestBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  if (!body.title || !body.kind || !body.verdict) {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
  }

  const slopScore =
    typeof body.slopScore === 'number'
      ? body.slopScore
      : Math.round((10 - Math.max(0, Math.min(10, body.score ?? 0))) * 10)

  const entry: ActivityEntry = {
    id: `ingest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind: body.kind,
    source: 'github',
    title: body.title,
    repo: body.repo,
    number: body.number,
    url: body.url,
    score: body.score ?? 0,
    slopScore,
    verdict: body.verdict,
    scannedAt: new Date().toISOString(),
  }
  recordActivity(entry)

  return NextResponse.json({ ok: true, id: entry.id })
}
