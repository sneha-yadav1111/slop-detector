import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function ActivityFeedSkeleton() {
  return (
    <Card className="border-signal-border bg-signal-surface shadow-console">
      <CardHeader className="flex-row items-center justify-between space-y-0 border-b border-signal-border pb-4">
        <Skeleton className="h-5 w-36 bg-signal-border/60" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16 rounded-full bg-signal-border/60" />
          <Skeleton className="h-5 w-14 rounded-full bg-signal-border/60" />
        </div>
      </CardHeader>
      <CardContent className="space-y-2.5 pt-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded border border-signal-border bg-background/50 px-4 py-3"
          >
            <Skeleton className="h-2 w-2 shrink-0 rounded-full bg-signal-border/60" />
            <Skeleton className="h-5 w-10 rounded-full bg-signal-border/60" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-full max-w-[200px] bg-signal-border/60" />
              <Skeleton className="h-3 w-28 bg-signal-border/60" />
            </div>
            <Skeleton className="h-5 w-8 bg-signal-border/60" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
