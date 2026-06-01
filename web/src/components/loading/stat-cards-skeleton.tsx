import { Skeleton } from '@/components/ui/skeleton'

export function StatCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-console-border bg-console-panel p-5 shadow-console">
          <div className="flex items-center gap-4">
            <Skeleton className="h-11 w-11 shrink-0 rounded-lg bg-console-border/60" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-8 w-12 bg-console-border/60" />
              <Skeleton className="h-3 w-24 bg-console-border/60" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
