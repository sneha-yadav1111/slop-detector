'use client'

import type { Verdict } from '@/lib/types'

/**
 * Circular gauge showing the 0-100 slop score.
 * Color tracks the verdict (clean = green, gray = amber, slop = red).
 */
export function SlopGauge({
  slopScore,
  verdict,
  size = 132,
}: {
  slopScore: number
  verdict: Verdict
  size?: number
}) {
  const stroke = 10
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(100, slopScore)) / 100
  const dash = c * pct

  const color =
    verdict === 'clean'
      ? 'var(--console-green)'
      : verdict === 'gray'
        ? 'var(--console-amber)'
        : 'var(--console-red)'

  const glowColor =
    verdict === 'clean'
      ? 'var(--console-green-glow)'
      : verdict === 'gray'
        ? 'var(--console-amber-glow)'
        : 'var(--console-red-glow)'

  const label =
    verdict === 'clean' ? 'CLEAN' : verdict === 'gray' ? 'GRAY' : 'SLOP'

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/* Glow effect */}
      <div
        className="absolute inset-0 rounded-full blur-xl"
        style={{
          background: glowColor,
          opacity: 0.15,
        }}
      />
      <svg
        width={size}
        height={size}
        className="-rotate-90"
        role="img"
        aria-label={`Slop score ${slopScore} out of 100`}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--console-border)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="butt"
          strokeDasharray={`${dash} ${c}`}
          style={{ transition: 'stroke-dasharray 0.6s cubic-bezier(0.16,1,0.3,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-3xl font-bold tabular-nums text-console-text-bright">
          {slopScore}
        </span>
        <span className="font-mono text-[10px] font-bold uppercase tracking-wider" style={{ color }}>
          {label}
        </span>
        <span className="font-mono text-[9px] text-console-text-dim">
          slop / 100
        </span>
      </div>
    </div>
  )
}
