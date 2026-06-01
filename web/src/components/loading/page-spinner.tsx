import { Crosshair } from 'lucide-react'

export function PageSpinner({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
      <div className="relative flex h-14 w-14 items-center justify-center rounded border border-console-green/40 bg-console-green/10 text-console-green">
        <Crosshair className="h-7 w-7 animate-pulse" />
        <span className="absolute inset-0 rounded border border-console-green/30 animate-ping opacity-40" />
      </div>
      <p className="font-mono text-sm text-console-text-dim">{label}</p>
    </div>
  )
}
