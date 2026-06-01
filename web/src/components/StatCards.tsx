'use client'

import { CheckCircle2, FileScan, ShieldAlert, TriangleAlert } from 'lucide-react'
import type { ActivityStats } from './ActivityFeed'
import { Card, CardContent } from './ui/card'

const ITEMS = [
  { key: 'total', label: 'Scans this session', Icon: FileScan, tone: 'text-console-green' },
  { key: 'slop', label: 'Flagged as slop', Icon: ShieldAlert, tone: 'text-console-red' },
  { key: 'gray', label: 'Gray zone', Icon: TriangleAlert, tone: 'text-console-amber' },
  { key: 'clean', label: 'Clean', Icon: CheckCircle2, tone: 'text-console-green' },
] as const

export function StatCards({ stats, animate }: { stats: ActivityStats; animate?: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {ITEMS.map(({ key, label, Icon, tone }, i) => (
        <Card
          key={key}
          className={`hover-lift border-console-border bg-console-panel shadow-console ${animate ? `animate-in-up stagger-${i + 1}` : ''}`}
        >
          <CardContent className="flex items-center gap-4 p-5">
            <div className={`rounded border border-console-border bg-console-border/30 p-3 ${tone}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <div
                key={stats[key]}
                className={`font-mono text-3xl font-bold tracking-tight text-console-text-bright ${animate ? 'animate-count-up' : ''}`}
              >
                {stats[key]}
              </div>
              <div className="mt-1 font-mono text-[10px] font-medium uppercase tracking-wide text-console-text-dim">
                {label}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
