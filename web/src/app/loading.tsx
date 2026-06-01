import { Crosshair } from 'lucide-react'
import { PageSpinner } from '@/components/loading/page-spinner'
import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="border-b border-console-border p-5 md:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded border border-console-green/40 bg-console-green/10">
              <Crosshair className="h-5 w-5 text-console-green animate-pulse" />
            </div>
            <div className="h-6 w-32 animate-pulse rounded bg-console-border/60" />
          </div>
          <div className="h-10 w-28 animate-pulse rounded border border-console-border bg-console-panel" />
        </div>
      </div>
      <PageSpinner label="Loading Slop Detector Console..." />
    </div>
  )
}
