// src/adapters/dashboard/report.ts
// Optional Action → dashboard ingest reporter.
//
// When SLOP_DETECTOR_DASHBOARD_URL and SLOP_DETECTOR_INGEST_TOKEN are both set, the Action
// POSTs a compact scan summary to the hosted dashboard's /api/ingest endpoint so the
// live activity feed shows real triage runs. This is BEST-EFFORT and NON-BLOCKING:
// any missing config, network error, or non-2xx response is swallowed — the hero
// comment and run summary are never affected.

import * as core from '@actions/core'

export interface DashboardReport {
  kind: 'issue' | 'pr' | 'code'
  title: string
  repo?: string
  number?: number
  url?: string
  /** Quality score 0–10 (higher = better). */
  score: number
  verdict: 'slop' | 'gray' | 'clean'
}

/** Map a 0–10 quality score to the coarse verdict the dashboard expects. */
export function verdictFromScore(score: number): DashboardReport['verdict'] {
  if (score <= 2) return 'slop'
  if (score <= 5) return 'gray'
  return 'clean'
}

/** Best-effort POST to the dashboard ingest endpoint. Never throws. */
export async function reportToDashboard(
  report: DashboardReport,
  env: NodeJS.ProcessEnv = process.env,
): Promise<boolean> {
  const url = env.SLOP_DETECTOR_DASHBOARD_URL
  const token = env.SLOP_DETECTOR_INGEST_TOKEN
  if (!url || !token) return false // not configured — silently skip

  try {
    const endpoint = `${url.replace(/\/+$/, '')}/api/ingest`
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-slop-detector-token': token,
      },
      body: JSON.stringify({
        ...report,
        slopScore: Math.round((10 - Math.max(0, Math.min(10, report.score))) * 10),
      }),
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) {
      core.debug(`Dashboard ingest returned ${res.status} — ignoring.`)
      return false
    }
    core.info('Slop Detector: reported scan to dashboard.')
    return true
  } catch (err) {
    core.debug(`Dashboard ingest failed (non-blocking): ${(err as Error).message}`)
    return false
  }
}
