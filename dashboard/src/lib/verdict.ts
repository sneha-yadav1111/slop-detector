import type { Verdict } from './types'

export const VERDICT_META: Record<
  Verdict,
  { label: string; badge: any; dot: string; ring: string }
> = {
  clean: {
    label: 'CLEAN',
    badge: 'border-signal-cyan/40 bg-signal-cyan/10 text-signal-cyan',
    dot: 'bg-signal-cyan',
    ring: 'ring-signal-cyan/30',
  },
  gray: {
    label: 'GRAY ZONE',
    badge: 'border-signal-amber/40 bg-signal-amber/10 text-signal-amber',
    dot: 'bg-signal-amber',
    ring: 'ring-signal-amber/30',
  },
  slop: {
    label: 'SLOP',
    badge: 'border-signal-red/40 bg-signal-red/10 text-signal-red',
    dot: 'bg-signal-red',
    ring: 'ring-signal-red/30',
  },
}

export const KIND_META: Record<string, { label: string; icon: string }> = {
  pr: { label: 'Pull Request', icon: 'git-pull-request' },
  issue: { label: 'Issue', icon: 'circle-dot' },
  code: { label: 'Code comments', icon: 'code' },
}
