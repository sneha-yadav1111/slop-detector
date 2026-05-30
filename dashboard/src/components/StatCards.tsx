'use client'

import { CheckCircle2, ScanLine, ShieldAlert, TriangleAlert } from 'lucide-react'
import type { ActivityStats } from './ActivityFeed'

const ITEMS = [
  { key: 'total', label: 'Scans this session', Icon: ScanLine, color: 'signal-cyan' },
  { key: 'slop', label: 'Flagged as slop', Icon: ShieldAlert, color: 'signal-red' },
  { key: 'gray', label: 'Gray zone', Icon: TriangleAlert, color: 'signal-amber' },
  { key: 'clean', label: 'Clean', Icon: CheckCircle2, color: 'signal-cyan' },
] as const

export function StatCards({ stats, animate }: { stats: ActivityStats; animate?: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {ITEMS.map(({ key, label, Icon, color }, i) => (
        <div
          key={key}
          className={`relative bg-signal-surface rounded-sm p-4 border border-signal-border border-t-2 border-t-${color} hover:border-signal-border-hot transition-colors ${animate ? `animate-in-up stagger-${i + 1}` : ''}`}
        >
          <div className={`w-10 h-10 hex-icon flex items-center justify-center mb-3 bg-${color}/10 text-${color}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <div
              key={stats[key]}
              className={`font-display font-bold text-2xl text-signal-white tabular-nums ${animate ? 'animate-count-up' : ''}`}
            >
              {stats[key]}
            </div>
            <div className="font-data text-[10px] tracking-widest uppercase text-signal-text-mute mt-1">
              {label}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
