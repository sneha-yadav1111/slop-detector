import { LogoBadge } from '@/components/Logo'

export function PageSpinner({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
      <LogoBadge
        className="w-16 h-16 animate-pulse-slow border-signal-cyan/30"
        size={36}
        variant="muted"
      />
      <p className="font-data text-sm text-signal-text-dim">{label}</p>
    </div>
  )
}
