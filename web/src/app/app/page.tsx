'use client'

import { useCallback, useState } from 'react'
import { ActivityFeed, type ActivityStats } from '@/components/ActivityFeed'
import { StatCardsSkeleton } from '@/components/loading/stat-cards-skeleton'
import { OnboardingModal } from '@/components/OnboardingModal'
import { Scanner } from '@/components/Scanner'
import { AppSidebar } from '@/components/Sidebar'
import { StatCards } from '@/components/StatCards'
import { Badge } from '@/components/ui/badge'
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { Crosshair, Radar, ScanLine } from 'lucide-react'

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
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />

        <main className="relative min-w-0 flex-1">
          {/* Mobile header */}
          <div className="sticky top-0 z-50 flex items-center border-b border-console-border bg-background/90 p-4 backdrop-blur-md md:hidden">
            <SidebarTrigger className="h-10 w-10 border-console-border" />
            <Badge className="ml-4 border-console-border bg-console-panel font-mono uppercase tracking-wide text-console-text-bright">
              Slop Detector
            </Badge>
          </div>

          <div className="relative z-10 mx-auto max-w-6xl px-5 py-8 lg:px-10">
            {/* Header */}
            <header className="mb-12 pt-4 md:pt-8">
              <div className="animate-in-up stagger-1 flex items-center gap-2">
                <Badge
                  variant="default"
                  className="border border-console-green/30 bg-console-green/10 font-mono text-xs uppercase tracking-wide text-console-green shadow-glow-green"
                >
                  <ScanLine className="mr-1.5 h-3 w-3" />
                  Scan Track A
                </Badge>
                <Badge
                  variant="secondary"
                  className="border-console-border bg-console-panel font-mono text-xs text-console-text-dim"
                >
                  Code Review
                </Badge>
              </div>

              <h1 className="animate-in-up stagger-2 mt-4 py-1 text-4xl font-extrabold tracking-tight text-console-text-bright lg:text-5xl">
                Did a human actually{' '}
                <span className="text-console-green text-glow-green">read</span> what the{' '}
                <span className="text-console-green text-glow-green">AI wrote</span>?
              </h1>

              <p className="animate-in-up stagger-3 mt-5 max-w-2xl text-base leading-relaxed text-console-text-dim">
                Slop Detector scores the{' '}
                <strong className="font-medium text-console-text-bright">information density</strong>{' '}
                of pull requests, commit messages, and code comments — surfacing diff-restating
                filler, hollow commits, and comments that say nothing. Paste content or point at a
                live GitHub URL and see exactly what a reviewer would have flagged.
              </p>
            </header>

            {/* Stats */}
            <div className="animate-in-up stagger-4">
              {statsLoading && !statsReady ? (
                <StatCardsSkeleton />
              ) : (
                <StatCards stats={stats} animate={statsReady} />
              )}
            </div>

            {/* Scanner + Activity */}
            <section
              id="scanner"
              className="animate-in-up stagger-5 mt-10 grid scroll-mt-6 items-start gap-6 lg:grid-cols-[1.5fr_1fr]"
            >
              <div className="min-w-0">
                <Scanner onScanned={() => setRefreshKey((k) => k + 1)} />
              </div>
              <div className="min-w-0 lg:sticky lg:top-6 lg:self-start">
                <ActivityFeed
                  refreshKey={refreshKey}
                  onStats={onStats}
                  onLoadingChange={onActivityLoading}
                />
              </div>
            </section>

            {/* Footer */}
            <footer className="mt-12 border-t border-console-border pt-6 text-center font-mono text-xs font-medium uppercase tracking-wide text-console-text-dim">
              The same scoring core runs in the GitHub Action and this console. Heuristics first;
              the optional BYOK LLM only adjudicates the gray zone.
            </footer>
          </div>

          <OnboardingModal />
        </main>
      </div>
    </SidebarProvider>
  )
}
