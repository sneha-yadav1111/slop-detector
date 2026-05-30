import { ActivityFeedSkeleton } from '@/components/loading/activity-feed-skeleton'
import { StatCardsSkeleton } from '@/components/loading/stat-cards-skeleton'
import { Skeleton } from '@/components/ui/skeleton'
import { Target } from 'lucide-react'

export default function AppLoading() {
  return (
    <div className="flex min-h-screen w-full">
      <aside className="hidden w-64 shrink-0 border-r border-console-border bg-sidebar md:block">
        <div className="space-y-4 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded border border-console-green/40 bg-console-green/10">
              <Target className="h-5 w-5 text-console-green animate-pulse" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-24 rounded bg-console-border/60" />
              <Skeleton className="h-3 w-16 rounded bg-console-border/60" />
            </div>
          </div>
          <Skeleton className="h-9 w-full rounded-md border border-console-border bg-console-panel" />
          <Skeleton className="h-9 w-full rounded-md border border-console-border bg-console-panel" />
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-5 lg:px-10 lg:py-8">
        <div className="mx-auto max-w-6xl space-y-10">
          <div className="space-y-4">
            <div className="flex gap-2">
              <Skeleton className="h-6 w-28 rounded-full border border-console-border bg-console-panel" />
              <Skeleton className="h-6 w-24 rounded-full border border-console-border bg-console-panel" />
            </div>
            <Skeleton className="h-12 w-full max-w-xl bg-console-border/60" />
            <Skeleton className="h-20 w-full max-w-2xl bg-console-border/60" />
          </div>
          <StatCardsSkeleton />
          <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            <Skeleton className="h-[420px] w-full rounded-xl border border-console-border bg-console-panel" />
            <ActivityFeedSkeleton />
          </div>
        </div>
      </main>
    </div>
  )
}
