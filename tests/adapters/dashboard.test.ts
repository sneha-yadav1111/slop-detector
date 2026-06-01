import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  type DashboardReport,
  reportToDashboard,
  verdictFromScore,
} from '../../src/adapters/dashboard/report.js'

vi.mock('@actions/core', () => ({
  info: vi.fn(),
  debug: vi.fn(),
}))

const REPORT: DashboardReport = {
  kind: 'issue',
  title: 'Test issue',
  repo: 'owner/repo',
  number: 1,
  url: 'https://github.com/owner/repo/issues/1',
  score: 4,
  verdict: 'gray',
}

describe('dashboard ingest reporter (optional, non-blocking)', () => {
  const realFetch = globalThis.fetch
  beforeEach(() => {
    vi.restoreAllMocks()
  })
  afterEach(() => {
    globalThis.fetch = realFetch
  })

  it('maps score to verdict', () => {
    expect(verdictFromScore(1)).toBe('slop')
    expect(verdictFromScore(4)).toBe('gray')
    expect(verdictFromScore(9)).toBe('clean')
  })

  it('is a no-op when not configured', async () => {
    const fetchSpy = vi.fn()
    globalThis.fetch = fetchSpy as unknown as typeof fetch
    const ok = await reportToDashboard(REPORT, {})
    expect(ok).toBe(false)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('POSTs with the shared-secret header when configured', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 200 })
    globalThis.fetch = fetchSpy as unknown as typeof fetch
    const ok = await reportToDashboard(REPORT, {
      SLOP_DETECTOR_DASHBOARD_URL: 'https://dash.example.com/',
      SLOP_DETECTOR_INGEST_TOKEN: 'secret',
    } as NodeJS.ProcessEnv)
    expect(ok).toBe(true)
    expect(fetchSpy).toHaveBeenCalledOnce()
    const [endpoint, init] = fetchSpy.mock.calls[0]
    expect(endpoint).toBe('https://dash.example.com/api/ingest')
    expect((init as RequestInit).headers).toMatchObject({ 'x-slop-detector-token': 'secret' })
    const sent = JSON.parse((init as RequestInit).body as string)
    expect(sent.slopScore).toBe(60) // (10-4)*10
  })

  it('swallows network errors (never throws)', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('boom')) as unknown as typeof fetch
    const ok = await reportToDashboard(REPORT, {
      SLOP_DETECTOR_DASHBOARD_URL: 'https://dash.example.com',
      SLOP_DETECTOR_INGEST_TOKEN: 'secret',
    } as NodeJS.ProcessEnv)
    expect(ok).toBe(false)
  })

  it('treats a non-2xx response as a soft failure', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 401 }) as unknown as typeof fetch
    const ok = await reportToDashboard(REPORT, {
      SLOP_DETECTOR_DASHBOARD_URL: 'https://dash.example.com',
      SLOP_DETECTOR_INGEST_TOKEN: 'secret',
    } as NodeJS.ProcessEnv)
    expect(ok).toBe(false)
  })
})
