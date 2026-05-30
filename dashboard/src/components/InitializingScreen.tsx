'use client'

import { useEffect, useState } from 'react'
import { Activity, ScanLine, Cpu, ShieldCheck } from 'lucide-react'

const BOOT_LINES = [
  { text: 'Initializing Slop Detector Analysis Console...', icon: Cpu },
  { text: 'Loading heuristic engines...', icon: ScanLine },
  { text: 'Calibrating slop detection vectors...', icon: Activity },
  { text: 'Systems nominal. Console ready.', icon: ShieldCheck },
]

export function InitializingScreen({ onComplete }: { onComplete: () => void }) {
  const [visibleLines, setVisibleLines] = useState(0)
  const [currentLine, setCurrentLine] = useState(0)
  const [displayText, setDisplayText] = useState('')
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    if (currentLine >= BOOT_LINES.length) {
      const timer = setTimeout(() => {
        setIsComplete(true)
        setTimeout(onComplete, 400)
      }, 300)
      return () => clearTimeout(timer)
    }

    const line = BOOT_LINES[currentLine]
    let charIndex = 0
    setDisplayText('')

    const typeInterval = setInterval(() => {
      charIndex++
      setDisplayText(line.text.slice(0, charIndex))
      if (charIndex >= line.text.length) {
        clearInterval(typeInterval)
        setVisibleLines((prev) => prev + 1)
        const nextTimer = setTimeout(() => {
          setCurrentLine((prev) => prev + 1)
        }, 180)
        return () => clearTimeout(nextTimer)
      }
    }, 20)

    return () => clearInterval(typeInterval)
  }, [currentLine, onComplete])

  if (isComplete) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background animate-fade-in">
        <div className="relative flex items-center justify-center">
          <div className="absolute h-32 w-32 rounded-full border border-console-green/20 animate-radar-ping" />
          <div className="absolute h-32 w-32 rounded-full border border-console-green/30 animate-radar-ping" style={{ animationDelay: '0.5s' }} />
          <Activity className="h-12 w-12 text-console-green" />
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background">
      <div className="w-full max-w-lg px-6">
        {/* Header */}
        <div className="mb-8 flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded border border-console-green/40 bg-console-green/10">
            <Activity className="h-5 w-5 text-console-green" />
            <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-console-green animate-ping" />
          </div>
          <div>
            <div className="text-sm font-bold tracking-wider text-console-text-bright uppercase">
              Slop Detector
            </div>
            <div className="text-xs font-mono text-console-text-dim">
              Analysis Console v2.1
            </div>
          </div>
        </div>

        {/* Boot lines */}
        <div className="space-y-3 font-mono text-sm">
          {BOOT_LINES.map((line, index) => {
            const Icon = line.icon
            const isVisible = index < visibleLines
            const isCurrent = index === currentLine
            const isFuture = index > currentLine

            if (isFuture) return null

            return (
              <div
                key={index}
                className={`flex items-center gap-3 transition-all duration-300 ${
                  isVisible ? 'opacity-100' : isCurrent ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded ${
                  isVisible
                    ? 'text-console-green'
                    : isCurrent
                      ? 'text-console-amber'
                      : 'text-console-text-dim'
                }`}>
                  {isVisible ? (
                    <Icon className="h-3.5 w-3.5" />
                  ) : isCurrent ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-console-amber animate-pulse" />
                  ) : null}
                </span>
                <span className={`${
                  isVisible
                    ? 'text-console-text-dim'
                    : isCurrent
                      ? 'text-console-text-bright'
                      : 'text-console-text-dim'
                }`}>
                  {isCurrent ? (
                    <>
                      {displayText}
                      <span className="animate-blink-cursor ml-0.5 inline-block h-4 w-[2px] bg-console-green align-middle" />
                    </>
                  ) : (
                    line.text
                  )}
                </span>
                {isVisible && (
                  <span className="ml-auto text-xs text-console-green">OK</span>
                )}
              </div>
            )
          })}
        </div>

        {/* Progress bar */}
        <div className="mt-6 h-1 w-full overflow-hidden rounded-full bg-console-border">
          <div
            className="h-full rounded-full bg-console-green transition-all duration-300 ease-out"
            style={{ width: `${((visibleLines + (currentLine < BOOT_LINES.length ? 0.5 : 0)) / BOOT_LINES.length) * 100}%` }}
          />
        </div>

        {/* Status footer */}
        <div className="mt-4 flex items-center justify-between font-mono text-[10px] text-console-text-dim uppercase tracking-wider">
          <span>SYS_INIT_SEQ_{String(currentLine + 1).padStart(2, '0')}</span>
          <span>
            {Math.round(((visibleLines + (currentLine < BOOT_LINES.length ? 0.5 : 0)) / BOOT_LINES.length) * 100)}%
          </span>
        </div>
      </div>
    </div>
  )
}
