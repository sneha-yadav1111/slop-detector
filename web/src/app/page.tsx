import {
  ArrowRight,
  Cpu,
  Crosshair,
  FileCode2,
  GitCommit,
  Radar,
  ScanLine,
  ShieldAlert,
  Target,
  Zap,
} from 'lucide-react'
import Link from 'next/link'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'

export default function LandingPage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      {/* Decorative crosshairs */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.03]">
        <div className="absolute left-[20%] top-[15%] h-24 w-24 border border-console-border-bright" />
        <div className="absolute left-[20%] top-[15%] h-24 w-24 crosshair-decoration" />
        <div className="absolute right-[15%] top-[25%] h-16 w-16 border border-console-border-bright" />
        <div className="absolute right-[15%] top-[25%] h-16 w-16 crosshair-decoration" />
        <div className="absolute bottom-[20%] left-[30%] h-20 w-20 border border-console-border-bright" />
        <div className="absolute bottom-[20%] left-[30%] h-20 w-20 crosshair-decoration" />
      </div>

      <header className="z-10 flex items-center justify-between border-b border-console-border bg-background/90 p-5 backdrop-blur-md md:px-8">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded border border-console-green/40 bg-console-green/10 md:h-12 md:w-12">
            <Crosshair className="h-5 w-5 text-console-green md:h-6 md:w-6" />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-console-green animate-pulse" />
          </div>
          <div>
            <div className="text-lg font-bold leading-none tracking-tight text-console-text-bright md:text-xl">
              Slop Detector
            </div>
            <div className="mt-1 text-[10px] font-mono font-medium uppercase tracking-widest text-console-text-dim md:text-xs">
              Analysis Console
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link href="/app">
            <Button
              variant="outline"
              size="lg"
              className="hidden border-console-border bg-console-panel text-console-text-bright hover:border-console-green/40 hover:bg-console-green/10 hover:text-console-green sm:inline-flex"
            >
              Enter Console <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              size="sm"
              className="border-console-border bg-console-panel text-console-text-bright hover:border-console-green/40 sm:hidden"
            >
              Console
            </Button>
          </Link>
        </div>
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center p-6 text-center md:p-12">
        {/* Central glow */}
        <div className="pointer-events-none absolute top-1/2 left-1/2 -z-10 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-console-green/5 blur-3xl" />

        <div className="max-w-4xl animate-in-up space-y-8">
          <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded border border-console-green/30 bg-console-green/10 px-4 py-1.5 font-mono text-xs font-semibold uppercase tracking-wide text-console-green">
            <ShieldAlert className="h-4 w-4" />
            Zero-tolerance for AI slop
          </div>

          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-console-text-bright md:text-6xl lg:text-7xl">
            Did a human actually
            <br />
            <span className="text-glow-green text-console-green">read what the AI wrote?</span>
          </h1>

          <p className="mx-auto max-w-2xl text-base font-medium leading-relaxed text-console-text-dim md:text-xl">
            Slop Detector scores the information density of pull requests, commit messages, and code
            comments. Surface diff-restating filler, hollow commits, and comments that say
            absolutely nothing.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 pt-8 sm:flex-row">
            <Link href="/app">
              <Button
                size="lg"
                className="h-14 border border-console-green/40 bg-console-green/10 px-8 text-lg text-console-green shadow-glow-green hover:bg-console-green/20 hover:text-console-green"
              >
                Initialize Scanner <Radar className="ml-3 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Feature cards */}
        <div
          className="mt-24 grid w-full max-w-5xl animate-in-up grid-cols-1 gap-6 text-left md:grid-cols-3"
          style={{ animationDelay: '150ms' }}
        >
          {[
            {
              Icon: GitCommit,
              title: 'Hollow Commits',
              body: 'Flags generic filler like "update", "fix stuff", and "address comments" while sparing legitimate structural commits.',
            },
            {
              Icon: FileCode2,
              title: 'Diff-Restating',
              body: 'Detects when descriptions and code comments merely restate the code line-by-line instead of explaining why.',
            },
            {
              Icon: Target,
              title: 'Information Density',
              body: 'A 0-100 slop score powered by deterministic heuristics, only falling back to an LLM for the hardest gray zones.',
            },
          ].map(({ Icon, title, body }, i) => (
            <div
              key={title}
              className="console-panel hover-lift rounded-lg p-6"
              style={{ animationDelay: `${50 * i}ms` }}
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded border border-console-border-bright bg-console-border/30">
                <Icon className="h-5 w-5 text-console-green" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-console-text-bright">{title}</h3>
              <p className="text-sm text-console-text-dim">{body}</p>
            </div>
          ))}
        </div>

        {/* Stats bar */}
        <div className="mt-16 flex flex-wrap items-center justify-center gap-8 border-y border-console-border bg-console-panel/50 px-8 py-6 font-mono text-sm">
          {[
            { label: 'Detection vectors', value: '12+' },
            { label: 'Scan latency', value: '<2s' },
            { label: 'Heuristics first', value: '100%' },
            { label: 'LLM fallback', value: 'Gray only' },
          ].map((stat) => (
            <div key={stat.label} className="flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 text-console-amber" />
              <span className="text-console-text-dim uppercase tracking-wider">{stat.label}</span>
              <span className="text-console-text-bright font-bold">{stat.value}</span>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-console-border p-6 text-center font-mono text-xs font-medium uppercase tracking-wide text-console-text-dim">
        Slop Detector Analysis Console · Built with Next.js · Tailwind · Deterministic Heuristics
      </footer>
    </div>
  )
}
