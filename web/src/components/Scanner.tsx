'use client'

import { Check, Code2, Loader2, Radar, Scan, Terminal, XCircle } from 'lucide-react'
import { useState } from 'react'
import { ScanResultSkeleton } from '@/components/loading/scan-result-skeleton'
import { EXAMPLES, type Example } from '@/lib/examples'
import type { ScanResult } from '@/lib/types'
import { GithubIcon } from './icons'
import { ResultPanel } from './ResultPanel'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { Progress } from './ui/progress'
import { Tabs, TabsList, TabsTrigger } from './ui/tabs'
import { Textarea } from './ui/textarea'

type PipelineEvent = { type: string; message: string }

const PIPELINE_STEPS = 5

function PipelineProgress({
  events,
  loading,
  progress,
}: {
  events: PipelineEvent[]
  loading: boolean
  progress: number
}) {
  if (events.length === 0 && !loading) return null
  return (
    <div className="mt-6 rounded-lg border border-console-border bg-console-panel p-5 shadow-console">
      <h3 className="mb-3 flex items-center gap-2 font-mono text-sm font-semibold text-console-text-bright">
        {loading && <Loader2 className="h-4 w-4 animate-spin text-console-green" />}
        <Terminal className="h-3.5 w-3.5 text-console-text-dim" />
        Live pipeline
      </h3>
      <Progress
        value={progress}
        className="mb-4 h-1.5 bg-console-border"
      />
      <div className="space-y-3 font-mono text-xs">
        {events.map((e, i) => {
          const isLast = i === events.length - 1 && loading
          return (
            <div
              key={i}
              className={`flex items-start gap-3 ${isLast ? 'text-console-amber' : 'text-console-text-dim'}`}
            >
              <div className="mt-0.5">
                {isLast ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-console-amber" />
                ) : (
                  <div className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border border-console-green/40 bg-console-green/20 text-console-green">
                    <Check className="h-2.5 w-2.5" strokeWidth={3} />
                  </div>
                )}
              </div>
              <div className="flex-1 font-medium">{e.message}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Scan Loading Overlay ─── */
function ScanLoadingOverlay() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm animate-fade-in">
      <div className="flex flex-col items-center gap-6">
        {/* Radar animation */}
        <div className="relative flex h-24 w-24 items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-console-green/20 animate-radar-ping" />
          <div className="absolute inset-0 rounded-full border border-console-green/30 animate-radar-ping" style={{ animationDelay: '0.5s' }} />
          <div className="absolute inset-2 rounded-full border border-console-green/15 animate-radar-ping" style={{ animationDelay: '1s' }} />
          <Radar className="relative h-10 w-10 text-console-green" />
        </div>

        <div className="text-center">
          <div className="font-mono text-sm font-semibold text-console-text-bright">
            Running analysis sequence...
          </div>
          <div className="mt-2 font-mono text-xs text-console-text-dim">
            Heuristics engine active · LLM gray-zone adjudication pending
          </div>
        </div>

        {/* Status dots */}
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-console-green animate-pulse" />
          <span className="h-1.5 w-1.5 rounded-full bg-console-amber animate-pulse" style={{ animationDelay: '0.2s' }} />
          <span className="h-1.5 w-1.5 rounded-full bg-console-red animate-pulse" style={{ animationDelay: '0.4s' }} />
        </div>
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

export function Scanner({ onScanned }: { onScanned: () => void }) {
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

  return (
    <div className="space-y-6">
      {/* Full-screen scan overlay */}
      {loading && pipelineEvents.length < 2 && <ScanLoadingOverlay />}

      <Card className="glass-card overflow-hidden border-console-border">
        <CardHeader className="border-b border-console-border/40 bg-console-panel pb-4">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-console-text-bright">
            <Scan className="h-4 w-4 text-console-green" /> Scan for slop
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
            <TabsList className="grid w-full grid-cols-4 border border-console-border bg-console-panel">
              <TabsTrigger
                value="github"
                className="gap-1.5 font-mono text-xs data-[state=active]:bg-console-green/15 data-[state=active]:text-console-green"
              >
                <GithubIcon className="h-3.5 w-3.5" /> Live URL
              </TabsTrigger>
              <TabsTrigger
                value="pr"
                className="font-mono text-xs data-[state=active]:bg-console-green/15 data-[state=active]:text-console-green"
              >
                PR text
              </TabsTrigger>
              <TabsTrigger
                value="issue"
                className="font-mono text-xs data-[state=active]:bg-console-green/15 data-[state=active]:text-console-green"
              >
                Issue
              </TabsTrigger>
              <TabsTrigger
                value="code"
                className="gap-1.5 font-mono text-xs data-[state=active]:bg-console-green/15 data-[state=active]:text-console-green"
              >
                <Code2 className="h-3.5 w-3.5" /> Code
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <form onSubmit={submit} className="mt-4 space-y-3">
            {mode === 'github' ? (
              <Input
                value={ref}
                onChange={(e) => setRef(e.target.value)}
                placeholder={PLACEHOLDERS.github}
                className={`border-console-border bg-console-panel font-mono text-sm text-console-text-bright placeholder:text-console-text-dim/50 focus:border-console-green/40 focus:ring-console-green/20 ${!ref && !loading ? 'pulse-hint' : ''}`}
              />
            ) : (
              <>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={mode === 'code' ? 'File name (optional)' : 'Title (optional)'}
                  className="border-console-border bg-console-panel font-mono text-sm text-console-text-bright placeholder:text-console-text-dim/50 focus:border-console-green/40 focus:ring-console-green/20"
                />
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder={PLACEHOLDERS[mode]}
                  rows={mode === 'code' ? 10 : 7}
                  className="border-console-border bg-console-panel font-mono text-sm text-console-text-bright placeholder:text-console-text-dim/50 focus:border-console-green/40 focus:ring-console-green/20"
                />
              </>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full border border-console-green/40 bg-console-green/10 font-mono text-sm text-console-green hover:bg-console-green/20 hover:text-console-green disabled:opacity-50"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Scanning...
                </>
              ) : (
                <>
                  <Scan className="mr-2 h-4 w-4" /> Run scan
                </>
              )}
            </Button>
          </form>

          {(loading || pipelineEvents.length > 0) && (
            <PipelineProgress events={pipelineEvents} loading={loading} progress={progress} />
          )}

          <div className="mt-5 border-t border-console-border pt-4">
            <div className="mb-2.5 font-mono text-[10px] font-medium uppercase tracking-wide text-console-text-dim">
              Try an example
            </div>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex.label}
                  type="button"
                  onClick={() => loadExample(ex)}
                  title={ex.description}
                  disabled={loading}
                  className="rounded border border-console-border bg-console-panel/60 px-3 py-1.5 font-mono text-[11px] text-console-text-dim transition-all hover:border-console-green/30 hover:bg-console-green/10 hover:text-console-green disabled:opacity-50"
                >
                  {ex.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-lg border border-console-red/40 bg-console-red/10 px-4 py-3 font-mono text-sm text-console-red">
              <span className="mr-2 inline-flex h-4 w-4 items-center justify-center rounded-full border border-console-red/40">
                <XCircle className="h-3 w-3" />
              </span>
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {loading && !result ? (
        <ScanResultSkeleton />
      ) : result ? (
        <ResultPanel result={result} />
      ) : (
        <Card className="border-dashed border-console-border bg-console-panel/40 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="mb-2 rounded-full border border-console-border bg-console-panel p-4">
              <Scan className="h-8 w-8 text-console-text-dim" />
            </div>
            <p className="max-w-sm text-sm text-console-text-dim">
              Paste a PR, issue, or code — or load an example — to see a slop analysis.
            </p>
            <Badge
              variant="secondary"
              className="mt-2 border-console-border bg-console-panel font-mono text-[10px] text-console-text-dim"
            >
              Heuristics-first · LLM only for the gray zone
            </Badge>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
