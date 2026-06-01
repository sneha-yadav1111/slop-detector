'use client'

import { Activity, Cpu, Radar } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ActivityFeedSkeleton } from '@/components/loading/activity-feed-skeleton'
import type { ActivityEntry } from '@/lib/types'
import { VERDICT_META } from '@/lib/verdict'
import { Badge } from './ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  return `${Math.floor(s / 3600)}h ago`
}

const KIND_LABEL: Record<string, string> = { pr: 'PR', issue: 'Issue', code: 'Code' }

export interface ActivityStats {
  total: number
  slop: number
  clean: number
  gray: number
}

export function ActivityFeed({
  refreshKey,
  onStats,
  onLoadingChange,
}: {
  refreshKey: number
  onStats?: (s: ActivityStats, status: { llm: boolean; gh: boolean }) => void
  onLoadingChange?: (loading: boolean) => void
}) {
  const [entries, setEntries] = useState<ActivityEntry[]>([])
  const [status, setStatus] = useState<{ llm: boolean; gh: boolean }>({ llm: false, gh: false })
  const [isLoading, setIsLoading] = useState(true)
  const hasLoadedRef = useRef(false)

  useEffect(() => {
    void refreshKey
    let alive = true
    const load = async () => {
      if (!hasLoadedRef.current) {
        setIsLoading(true)
        onLoadingChange?.(true)
      }
      try {
        const res = await fetch('/api/activity', { cache: 'no-store' })
        const data = await res.json()
        if (!alive) return
        const list: ActivityEntry[] = data.activity ?? []
        setEntries(list)
        const st = { llm: data.llmAvailable, gh: data.githubAuthed }
        setStatus(st)
        onStats?.(
          {
            total: list.length,
            slop: list.filter((e) => e.verdict === 'slop').length,
            clean: list.filter((e) => e.verdict === 'clean').length,
            gray: list.filter((e) => e.verdict === 'gray').length,
          },
          st,
        )
      } catch {
        /* ignore */
      } finally {
        if (alive) {
          setIsLoading(false)
          hasLoadedRef.current = true
          onLoadingChange?.(false)
        }
      }
    }
    load()
    const t = setInterval(load, 4000)
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [refreshKey, onStats, onLoadingChange])

  if (isLoading) {
    return <ActivityFeedSkeleton />
  }

  return (
    <Card className="animate-fade-in border-console-border bg-console-panel shadow-console">
      <CardHeader className="flex-row items-center justify-between space-y-0 border-b border-console-border pb-4">
        <CardTitle className="flex items-center gap-2 font-mono text-sm font-semibold text-console-text-bright">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-console-green opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-console-green" />
          </span>
          Live scan activity
        </CardTitle>
        <div className="flex gap-1.5">
          <Badge
            variant={status.gh ? 'success' : 'secondary'}
            className={`text-[10px] font-mono ${status.gh ? 'border-console-green/30 bg-console-green/10 text-console-green' : 'border-console-border bg-console-border/40 text-console-text-dim'}`}
          >
            GitHub {status.gh ? 'authed' : 'public'}
          </Badge>
          <Badge
            variant={status.llm ? 'default' : 'secondary'}
            className={`text-[10px] font-mono ${status.llm ? 'border-console-green/30 bg-console-green/10 text-console-green' : 'border-console-border bg-console-border/40 text-console-text-dim'}`}
          >
            LLM {status.llm ? 'on' : 'off'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="rounded-full border border-console-border bg-console-panel p-3">
              <Activity className="h-6 w-6 text-console-text-dim" />
            </div>
            <p className="font-mono text-sm text-console-text-dim">
              No scans yet. Run a scan to populate the feed.
            </p>
          </div>
        ) : (
          <ul className="mt-2 space-y-2.5">
            {entries.map((e, i) => {
              const v = VERDICT_META[e.verdict]
              return (
                <li
                  key={e.id}
                  className={`flex animate-slide-in-left stagger-${(i % 8) + 1} items-center gap-3 rounded border border-console-border bg-background/50 px-4 py-3 shadow-sm transition-colors hover:bg-console-border/30`}
                >
                  <span className={`h-2 w-2 shrink-0 rounded-full ${v.dot}`} />
                  <Badge
                    variant="secondary"
                    className="shrink-0 border-console-border bg-console-panel font-mono text-[10px] uppercase text-console-text-dim"
                  >
                    {KIND_LABEL[e.kind] ?? e.kind}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-console-text-bright/90">{e.title}</div>
                    <div className="truncate font-mono text-[11px] text-console-text-dim">
                      {e.repo ? `${e.repo}#${e.number}` : e.source} · {timeAgo(e.scannedAt)}
                    </div>
                  </div>
                  <span className={`font-mono text-sm font-bold tabular-nums ${v.ring}`}>
                    {e.slopScore}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
