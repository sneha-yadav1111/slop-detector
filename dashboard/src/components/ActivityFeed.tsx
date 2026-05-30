'use client'

import { useEffect, useRef, useState } from 'react'
import { ActivityFeedSkeleton } from '@/components/loading/activity-feed-skeleton'
import type { ActivityEntry } from '@/lib/types'
import { VERDICT_META } from '@/lib/verdict'

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  return `${Math.floor(s / 3600)}h ago`
}

const KIND_LABEL: Record<string, string> = { pr: 'PR', issue: 'Issue', code: 'Code' }

const VERDICT_DOT: Record<string, string> = {
  clean: 'w-2 h-2 rounded-full bg-signal-cyan mt-1 shrink-0 shadow-glow-cyan',
  slop: 'w-2 h-2 rounded-full bg-signal-red mt-1 shrink-0 shadow-glow-red',
  gray: 'w-2 h-2 rounded-full bg-signal-amber mt-1 shrink-0 shadow-glow-amber',
}

const VERDICT_TEXT: Record<string, string> = {
  clean: 'text-signal-cyan',
  slop: 'text-signal-red',
  gray: 'text-signal-amber',
}

export interface ActivityStats {
  total: number
  slop: number
  clean: number
  gray: number
}

export function ActivityFeed({
  refreshKey = 0,
  onStats,
  onLoadingChange,
}: {
  refreshKey?: number
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
    <div>
      {/* Header */}
      <div className="flex items-center justify-between py-3 px-1 border-b border-signal-border mb-1">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-signal-cyan animate-pulse-slow" />
          <span className="font-data text-xs tracking-widest uppercase text-signal-white">
            Live scan activity
          </span>
        </div>
        <span className="font-data text-[10px] text-signal-text-mute">
          {entries.length}
        </span>
      </div>

      {/* Entries */}
      {entries.length === 0 ? (
        <p className="text-sm text-signal-text-mute text-center py-8">
          No scans yet. Run a scan to populate the feed.
        </p>
      ) : (
        <ul>
          {entries.map((e, i) => {
            const v = VERDICT_META[e.verdict]
            return (
              <li
                key={e.id}
                className={`flex items-start gap-3 py-3 px-2 -mx-2 border-b border-signal-border hover:bg-signal-surface/50 rounded-sm transition-colors cursor-pointer animate-slide-in-left stagger-${(i % 8) + 1}`}
              >
                <span className={VERDICT_DOT[e.verdict]} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-data text-[10px] uppercase tracking-wide text-signal-text-mute">
                      {KIND_LABEL[e.kind] ?? e.kind}
                    </span>
                    <span className="font-data text-[10px] text-signal-text-mute">
                      {e.repo ? `${e.repo}#${e.number}` : e.source} · {timeAgo(e.scannedAt)}
                    </span>
                  </div>
                  <div className="text-sm text-signal-white font-medium truncate">
                    {e.title}
                  </div>
                </div>
                <span className={`font-data text-[10px] ${VERDICT_TEXT[e.verdict]}`}>
                  {e.slopScore}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
