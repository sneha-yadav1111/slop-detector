import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function ScanResultSkeleton() {
  return (
    <Card className="animate-fade-in overflow-hidden border-console-border bg-console-panel shadow-console">
      <div className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-6 w-24 rounded-full bg-console-border/60" />
            <Skeleton className="h-6 w-20 rounded-full bg-console-border/60" />
            <Skeleton className="h-6 w-16 rounded-full bg-console-border/60" />
          </div>
          <Skeleton className="h-7 w-full max-w-md bg-console-border/60" />
          <Skeleton className="h-4 w-40 bg-console-border/60" />
        </div>
        <Skeleton className="mx-auto h-[132px] w-[132px] shrink-0 rounded-full bg-console-border/60 md:mx-0" />
      </div>
      <CardContent className="space-y-4 border-t border-console-border pt-6">
        <Skeleton className="h-4 w-48 bg-console-border/60" />
        <Skeleton className="h-16 w-full rounded-lg bg-console-border/60" />
        <Skeleton className="h-4 w-40 bg-console-border/60" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-24 rounded-full bg-console-border/60" />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
