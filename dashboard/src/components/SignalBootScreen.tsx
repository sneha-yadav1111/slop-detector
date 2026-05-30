'use client'

import { useEffect, useState } from 'react'
import { LogoBadge } from '@/components/Logo'

const BOOT_LINES = [
  'SLOP DETECTOR v2 · SIGNAL INTELLIGENCE',
  'Loading heuristic engine...',
  'Connecting to activity store...',
  'Scanner ready.',
]

export function SignalBootScreen({ onComplete }: { onComplete: () => void }) {
  const [visibleCount, setVisibleCount] = useState(0)
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setVisibleCount((prev) => {
        if (prev >= BOOT_LINES.length) {
          clearInterval(interval)
          return prev
        }
        return prev + 1
      })
    }, 400)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (visibleCount >= BOOT_LINES.length) {
      const timer = setTimeout(() => {
        setIsComplete(true)
        const completeTimer = setTimeout(() => {
          onComplete()
        }, 600)
        return () => clearTimeout(completeTimer)
      }, 600)
      return () => clearTimeout(timer)
    }
  }, [visibleCount, onComplete])

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-signal-bg">
      <LogoBadge
        className="w-16 h-16 animate-pulse-slow mb-8"
        size={36}
        variant="muted"
      />
      <div className="space-y-2 mb-6 text-center">
        {BOOT_LINES.map((line, i) =>
          i < visibleCount ? (
            <div key={i} className="font-data text-xs text-signal-cyan tracking-wide animate-mount">
              <span className="text-signal-text-mute">› </span>
              {line}
            </div>
          ) : null
        )}
      </div>
      {isComplete && (
        <div className="font-data text-xs tracking-[0.3em] text-signal-cyan animate-pulse-slow uppercase mt-4">
          READY
        </div>
      )}
    </div>
  )
}
