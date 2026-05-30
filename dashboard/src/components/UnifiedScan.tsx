'use client'

import { EXAMPLES, type Example } from '@/lib/examples'
import { Cpu, FileCode2, GitPullRequest, Target } from 'lucide-react'
import { Button } from './ui/button'

const PICK_LABELS = [
  'Hollow AI PR (paste)',
  'Strong PR (paste)',
  'Hollow comments (code)',
  'Low-effort issue (paste)',
]

export function UnifiedScan({ onRun }: { onRun: (ex: Example) => void }) {
  const picks = PICK_LABELS.map((label) => EXAMPLES.find((e) => e.label === label)).filter(
    (e): e is Example => Boolean(e),
  )

  return (
    <section className="mt-8 rounded border border-console-border bg-console-panel/60 p-4">
      <h3 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-console-text-dim">
        <Cpu className="h-3.5 w-3.5 text-console-green" />
        Unified scan (cross-track bonus)
      </h3>
      <p className="mt-2 font-mono text-sm text-console-text-dim">
        One engine — PR, issue, and code comments — same detectors as the Action.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {picks.map((ex) => (
          <Button
            key={ex.label}
            type="button"
            variant="outline"
            className="rounded border border-console-border bg-console-panel font-mono text-[11px] text-console-text-dim hover:border-console-green/30 hover:bg-console-green/10 hover:text-console-green"
            onClick={() => onRun(ex)}
          >
            {ex.label}
          </Button>
        ))}
      </div>
    </section>
  )
}
