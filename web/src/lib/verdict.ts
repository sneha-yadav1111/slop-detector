import type { Verdict } from './types'

export const VERDICT_META: Record<
  Verdict,
  { label: string; badge: 'success' | 'warning' | 'destructive'; dot: string; ring: string }
> = {
  clean: {
    label: 'Clean',
    badge: 'success',
    dot: 'bg-success',
    ring: 'text-success',
  },
  gray: {
    label: 'Gray zone',
    badge: 'warning',
    dot: 'bg-warning',
    ring: 'text-warning',
  },
  slop: {
    label: 'Slop',
    badge: 'destructive',
    dot: 'bg-destructive',
    ring: 'text-destructive',
  },
}

export const KIND_META: Record<string, { label: string; icon: string }> = {
  pr: { label: 'Pull Request', icon: 'git-pull-request' },
  issue: { label: 'Issue', icon: 'circle-dot' },
  code: { label: 'Code comments', icon: 'code' },
}
