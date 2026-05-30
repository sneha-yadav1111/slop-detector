'use client'

import { Code2, ScanLine, XCircle } from 'lucide-react'
import { LogoBadge } from '@/components/Logo'
import { useState } from 'react'
import { ScanResultSkeleton } from '@/components/loading/scan-result-skeleton'
import { EXAMPLES, type Example } from '@/lib/examples'
import type { ScanResult } from '@/lib/types'
import { GithubIcon } from './icons'
import { ResultPanel } from './ResultPanel'

type PipelineEvent = { type: string; message: string }

const PIPELINE_STEPS = 5

function PipelineProgress({
  events,
  loading,
}: {
  events: PipelineEvent[]
  loading: boolean
}) {
  if (events.length === 0 && !loading) return null
  return (
    <div className="mt-6 space-y-2">
      {events.map((e, i) => {
        const isLast = i === events.length - 1 && loading
        return (
          <div
            key={i}
            className={`flex items-center gap-3 py-2 px-3 rounded-sm ${
              isLast
                ? 'border border-signal-border bg-signal-surface animate-pulse-slow'
                : 'border border-signal-cyan/20 bg-signal-cyan/5'
            }`}
          >
            <span className="font-data text-[10px] text-signal-text-mute w-6 shrink-0">
              {String(i + 1).padStart(2, '0')}
            </span>
            <span className="text-xs font-data text-signal-white">{e.message}</span>
          </div>
        )
      })}
    </div>
  )
}

/* ─── Scan Loading Overlay ─── */
function ScanLoadingOverlay({ progress }: { progress: number }) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-signal-bg/90 backdrop-blur-sm">
      <LogoBadge
        className="w-20 h-20 mb-4 animate-pulse-slow border-signal-cyan/40 bg-signal-surface"
        size={44}
        variant="muted"
      />
      <div className="font-data text-xs text-signal-cyan tracking-widest animate-pulse-slow mt-2">
        ANALYZING SIGNALS...
      </div>
      <div className="w-64 h-0.5 bg-signal-border rounded-full mt-4">
        <div className="h-full bg-signal-cyan rounded-full transition-all" style={{ width: `${progress}%` }} />
      </div>
    </div>
  )
}

type Mode = 'github' | 'pr' | 'issue' | 'code'

const PLACEHOLDERS: Record<Mode, string> = {
  github: 'https://github.com/facebook/react/pull/12345  ·  owner/repo#123',
  pr: 'Paste a pull-request description (and optionally commit messages)...',
  issue: 'Paste a GitHub issue body...',
  code: 'Paste source code — we flag comments that restate the code or say nothing...',
}

export function Scanner({ onScanned }: { onScanned: (...args: any[]) => void }) {
  const [mode, setMode] = useState<Mode>('github')
  const [ref, setRef] = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [pipelineEvents, setPipelineEvents] = useState<PipelineEvent[]>([])

  const progress =
    loading && pipelineEvents.length === 0
      ? 8
      : Math.min(95, Math.round((pipelineEvents.length / PIPELINE_STEPS) * 100))

  async function runScan(payload: Record<string, unknown>) {
    setLoading(true)
    setError(null)
    setPipelineEvents([])
    setResult(null)

    try {
      const response = await fetch('/api/scan/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error('Failed to start scan')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      if (!reader) throw new Error('No readable stream available')

      let buffer = ''
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        let eventEndIndex
        while ((eventEndIndex = buffer.indexOf('\n\n')) >= 0) {
          const eventChunk = buffer.slice(0, eventEndIndex)
          buffer = buffer.slice(eventEndIndex + 2)

          const lines = eventChunk.split('\n')
          let eventType = 'message'
          let eventData = ''
          for (const line of lines) {
            if (line.startsWith('event: ')) eventType = line.slice(7)
            if (line.startsWith('data: ')) eventData = line.slice(6)
          }

          if (eventData) {
            const parsed = JSON.parse(eventData)
            if (eventType === 'progress') {
              setPipelineEvents((prev) => [...prev, parsed])
            } else if (eventType === 'result') {
              setResult(parsed)
              onScanned()
            } else if (eventType === 'error') {
              setError(parsed.error)
            }
          }
        }
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (mode === 'github') runScan({ mode: 'github', ref })
    else if (mode === 'code') runScan({ mode: 'code', title, body })
    else runScan({ mode: 'paste', kind: mode, title, body })
  }

  function loadExample(ex: Example) {
    setError(null)
    if (ex.mode === 'github') {
      setMode('github')
      setRef(ex.ref ?? '')
      runScan({ mode: 'github', ref: ex.ref })
    } else if (ex.mode === 'code') {
      setMode('code')
      setTitle(ex.title ?? '')
      setBody(ex.body ?? '')
      runScan({ mode: 'code', title: ex.title, body: ex.body })
    } else {
      const k = ex.kind ?? 'issue'
      setMode(k)
      setTitle(ex.title ?? '')
      setBody(ex.body ?? '')
      runScan({ mode: 'paste', kind: k, title: ex.title, body: ex.body })
    }
  }

  const activeTabCls = 'flex items-center gap-2 px-4 py-2.5 text-xs font-data tracking-wide border-b-2 border-signal-cyan text-signal-cyan -mb-px'
  const inactiveTabCls = 'flex items-center gap-2 px-4 py-2.5 text-xs font-data tracking-wide border-b-2 border-transparent text-signal-text-mute hover:text-signal-text-dim -mb-px transition-colors'

  return (
    <div className="space-y-6">
      {/* Full-screen scan overlay */}
      {loading && pipelineEvents.length < 2 && <ScanLoadingOverlay progress={progress} />}

      <div className="bracket-card bg-signal-surface border border-signal-border rounded-sm p-5 relative">
        {/* Tabs */}
        <div className="flex border-b border-signal-border mb-6">
          <button
            type="button"
            onClick={() => setMode('github')}
            className={mode === 'github' ? activeTabCls : inactiveTabCls}
          >
            <GithubIcon className="w-3.5 h-3.5" /> Live URL
          </button>
          <button
            type="button"
            onClick={() => setMode('pr')}
            className={mode === 'pr' ? activeTabCls : inactiveTabCls}
          >
            PR text
          </button>
          <button
            type="button"
            onClick={() => setMode('issue')}
            className={mode === 'issue' ? activeTabCls : inactiveTabCls}
          >
            Issue
          </button>
          <button
            type="button"
            onClick={() => setMode('code')}
            className={mode === 'code' ? activeTabCls : inactiveTabCls}
          >
            <Code2 className="w-3.5 h-3.5" /> Code
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === 'github' ? (
            <input
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              placeholder={PLACEHOLDERS.github}
              className="w-full bg-signal-bg border border-signal-border rounded-sm px-3 h-10 text-sm font-data text-signal-white placeholder:text-signal-text-mute focus:outline-none focus:border-signal-cyan transition-colors"
            />
          ) : (
            <>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={mode === 'code' ? 'File name (optional)' : 'Title (optional)'}
                className="w-full bg-signal-bg border border-signal-border rounded-sm px-3 h-10 text-sm font-data text-signal-white placeholder:text-signal-text-mute focus:outline-none focus:border-signal-cyan transition-colors"
              />
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={PLACEHOLDERS[mode]}
                rows={mode === 'code' ? 10 : 7}
                className="w-full bg-signal-bg border border-signal-border rounded-sm p-3 text-sm font-data text-signal-white placeholder:text-signal-text-mute focus:outline-none focus:border-signal-cyan transition-colors resize-none"
              />
            </>
          )}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="bg-signal-cyan text-signal-bg font-display font-bold text-xs tracking-wider px-5 h-10 rounded-sm hover:bg-white hover:shadow-glow-cyan transition-all shrink-0"
            >
              {loading ? 'SCANNING...' : 'SCAN'}
            </button>
          </div>
        </form>

        {(loading || pipelineEvents.length > 0) && (
          <PipelineProgress events={pipelineEvents} loading={loading} />
        )}

        {error && (
          <div className="mt-4 rounded-sm border border-signal-red/40 bg-signal-red/10 px-4 py-3 text-sm font-data text-signal-red flex items-center gap-2">
            <XCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Examples */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 mt-4">
          <span className="font-data text-[10px] uppercase tracking-widest text-signal-text-mute mr-2 shrink-0">Try an example</span>
          {EXAMPLES.map((ex) => (
            <button
              key={ex.label}
              type="button"
              onClick={() => loadExample(ex)}
              title={ex.description}
              disabled={loading}
              className="shrink-0 px-3 py-1.5 rounded-sm border border-signal-border text-xs font-data text-signal-text-dim hover:border-signal-cyan hover:text-signal-cyan transition-colors whitespace-nowrap disabled:opacity-40"
            >
              {ex.label}
            </button>
          ))}
        </div>
      </div>

      {loading && !result ? (
        <ScanResultSkeleton />
      ) : result ? (
        <ResultPanel result={result} />
      ) : (
        <div className="flex flex-col items-center justify-center py-16 px-6 border border-dashed border-signal-border rounded-sm text-center">
          <ScanLine className="w-8 h-8 text-signal-text-mute mb-4" />
          <p className="text-sm text-signal-text-dim">
            Paste a PR, issue, or code — or load an example — to see a slop analysis.
          </p>
        </div>
      )}
    </div>
  )
}
