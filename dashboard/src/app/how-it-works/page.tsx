import { BenchmarkSection, HowItWorks } from '@/components/InfoSections'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { LogoBadge } from '@/components/Logo'

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-signal-bg">
      {/* Top nav (same as app page) */}
      <header className="sticky top-0 z-50 border-b border-signal-border bg-signal-bg/90 backdrop-blur-md">
        <div className="flex items-center justify-between h-14 px-6 max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 text-signal-text-dim hover:text-signal-white transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <LogoBadge className="w-7 h-7" size={18} variant="muted" />
            <span className="font-display font-bold text-sm text-signal-white tracking-tight">SLOP DETECTOR</span>
            <span className="font-data text-[10px] text-signal-text-mute tracking-widest uppercase ml-1">/ Methodology</span>
          </div>
          <Link href="/app" className="h-8 px-4 rounded bg-signal-cyan text-signal-bg font-display font-bold text-xs tracking-wide hover:bg-white transition-colors inline-flex items-center">
            OPEN SCANNER →
          </Link>
        </div>
      </header>

      {/* Page content */}
      <div className="max-w-5xl mx-auto px-6 py-12 space-y-16">
        <header className="border-b border-signal-border pb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-signal-border-hot text-signal-cyan text-[10px] font-data tracking-widest mb-4">
            METHODOLOGY
          </div>
          <h1 className="font-display font-extrabold text-4xl text-signal-white tracking-tight mb-3">
            How Signal Detection<br />Actually Works
          </h1>
          <p className="text-signal-text-dim text-lg max-w-2xl font-light">
            One detection engine, four artifact kinds. Heuristics-first — no LLM required for a verdict.
            Optional bring-your-own-key adjudication for gray-zone scores only.
          </p>
        </header>
        <HowItWorks />
        <BenchmarkSection />
      </div>
    </div>
  )
}
