'use client'

import { useCallback, useState } from 'react'
import { ActivityFeed, type ActivityStats } from '@/components/ActivityFeed'
import { OnboardingModal } from '@/components/OnboardingModal'
import { Scanner } from '@/components/Scanner'
import { StatCards } from '@/components/StatCards'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { LogoBadge } from '@/components/Logo'

const EMPTY_STATS: ActivityStats = { total: 0, slop: 0, gray: 0, clean: 0 }

export default function Home() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [stats, setStats] = useState<ActivityStats>(EMPTY_STATS)
  const [statsLoading, setStatsLoading] = useState(true)
  const [statsReady, setStatsReady] = useState(false)

  const onStats = useCallback((s: ActivityStats) => {
    setStats(s)
    setStatsReady(true)
  }, [])

  const onActivityLoading = useCallback((loading: boolean) => {
    setStatsLoading(loading)
  }, [])

  return (
    <div className="flex flex-col h-screen bg-signal-bg overflow-hidden">
      {/* Top navigation */}
      <header className="sticky top-0 z-50 border-b border-signal-border bg-signal-bg/90 backdrop-blur-md shrink-0">
        <div className="flex items-center justify-between h-14 px-6">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 text-signal-text-dim hover:text-signal-white transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <LogoBadge className="w-7 h-7" size={18} variant="muted" />
            <span className="font-display font-bold text-sm text-signal-white tracking-tight">SLOP DETECTOR</span>
            <span className="font-data text-[10px] text-signal-text-mute tracking-widest uppercase ml-1">/ Scanner Console</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/how-it-works" className="font-data text-[10px] uppercase tracking-widest text-signal-text-dim hover:text-signal-white transition-colors">
              Methodology
            </Link>
            <a href="https://github.com/sneha-yadav1111/slop-scan" target="_blank" rel="noopener noreferrer" className="font-data text-[10px] uppercase tracking-widest text-signal-text-dim hover:text-signal-white transition-colors">
              GitHub
            </a>
          </div>
        </div>
      </header>

      {/* Stats strip */}
      <div className="border-b border-signal-border bg-signal-surface/30 shrink-0">
        <div className="px-6 py-3">
          <StatCards stats={stats} animate={statsReady} />
        </div>
      </div>

      {/* Two-pane main */}
      <div className="flex-1 grid grid-cols-[60fr_40fr] divide-x divide-signal-border overflow-hidden min-h-0">
        <div className="overflow-y-auto p-6">
          <Scanner onScanned={() => { setRefreshKey(k => k + 1); }} />
        </div>
        <div className="overflow-y-auto p-6 scan-sweep">
          <ActivityFeed
            refreshKey={refreshKey}
            onStats={onStats}
            onLoadingChange={onActivityLoading}
          />
        </div>
      </div>

      <OnboardingModal />
    </div>
  )
}
