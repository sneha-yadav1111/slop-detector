'use client'

import type { Verdict } from '@/lib/types'

/**
 * Segmented arc gauge showing the 0-100 slop score.
 * Color tracks the verdict (clean = cyan, gray = amber, slop = red).
 */
export function SlopGauge({
  slopScore,
  verdict,
  size = 128,
}: {
  slopScore: number
  verdict: Verdict
  size?: number
}) {
  const segments = Array.from({ length: 10 }, (_, i) => {
    const startAngle = 135 + i * 27
    const endAngle = startAngle + 23
    const startRad = (startAngle * Math.PI) / 180
    const endRad = (endAngle * Math.PI) / 180
    const x1 = 60 + 50 * Math.cos(startRad)
    const y1 = 60 - 50 * Math.sin(startRad)
    const x2 = 60 + 50 * Math.cos(endRad)
    const y2 = 60 - 50 * Math.sin(endRad)
    const d = `M ${x1.toFixed(2)} ${y1.toFixed(2)} A 50 50 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`
    return d
  })

  const filledCount = Math.round(slopScore / 10)

  let fillColor: string
  const dimColor = 'var(--signal-border)'

  if (verdict === 'slop') {
    fillColor = 'var(--signal-red)'
  } else if (verdict === 'gray') {
    fillColor = 'var(--signal-amber)'
  } else {
    fillColor = 'var(--signal-cyan)'
  }

  return (
    <div
      className="relative inline-flex items-center justify-center w-32 h-24"
      style={size !== 128 ? { width: size, height: size * 0.75 } : undefined}
    >
      {/* Glow effect */}
      <div
        className="absolute inset-0 rounded-full blur-xl opacity-20"
        style={{ background: fillColor }}
      />

      <svg
        viewBox="0 0 120 90"
        className="w-full h-full"
        role="img"
        aria-label={`Slop score ${slopScore} out of 100`}
      >
        {segments.map((d, i) => (
          <path
            key={i}
            d={d}
            stroke={i < filledCount ? fillColor : dimColor}
            strokeWidth="5"
            fill="none"
            strokeLinecap="round"
          />
        ))}
      </svg>

      <div className="absolute bottom-0 left-0 right-0 text-center">
        <div
          className="font-data text-3xl font-bold"
          style={{ color: fillColor }}
        >
          {slopScore}
        </div>
        <div className="font-data text-[9px] tracking-widest text-signal-text-mute uppercase">
          SLOP SCORE
        </div>
      </div>
    </div>
  )
}
