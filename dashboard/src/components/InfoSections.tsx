import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Cpu, FileCode2, GitCommit, MessageSquare, Target } from 'lucide-react'

const DETECTORS = [
  {
    title: 'Pull requests',
    icon: GitCommit,
    body: 'Structural + lexical analysis: motivation, testing, issue-link, risk vs. diff-restatement, hunk overlap, changelog-only boilerplate, thinness, test-file / sensitive-path gaps → information-density score.',
  },
  {
    title: 'Commit messages',
    icon: FileCode2,
    body: 'Flags generic filler ("update", "fix stuff", WIP, "address comments") while deliberately sparing mechanical-but-legit messages (merges, version bumps, dependency chores).',
  },
  {
    title: 'Code comments',
    icon: MessageSquare,
    body: 'Pairs each comment with the line it annotates and flags it when it merely restates the code, states the obvious, or is generic "This function…" boilerplate — keeping comments that explain WHY.',
  },
  {
    title: 'Issues (supporting)',
    icon: Target,
    body: '7 binary content signals (code block, stack trace, version, repro, expected/actual, minimal example, image-only) → an actionability score and a missing-info checklist.',
  },
]

export function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-6">
      <h2 className="mb-3 font-mono text-lg font-semibold text-console-text-bright">
        <Cpu className="mr-2 inline h-4 w-4 text-console-green" />
        How detection works
      </h2>
      <p className="mb-4 max-w-3xl font-mono text-sm text-console-text-dim">
        One unified engine, four detectors. Everything is heuristics-first — no LLM is required for
        a verdict. An optional bring-your-own-key LLM only adjudicates gray-zone cases. The same
        scoring core runs in this dashboard, the GitHub Action, and the benchmark, so the published
        numbers reflect the real path.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {DETECTORS.map((d) => {
          const Icon = d.icon
          return (
            <Card key={d.title} className="hover-lift border-console-border bg-console-panel shadow-console">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm text-console-text-bright">
                  <Icon className="h-4 w-4 text-console-green" />
                  {d.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="font-mono text-sm leading-relaxed text-console-text-dim">
                {d.body}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </section>
  )
}

const TRACK_A_METRICS = [
  { label: 'F1 (Track A)', value: '0.90', ci: 'N=87 fixtures' },
  { label: 'Precision', value: '1.00', ci: '0% FPR' },
  { label: 'Recall', value: '0.82', ci: '9 borderline FN' },
  { label: 'Rule', value: '≤3', ci: 'PR slop threshold' },
]

const ISSUE_METRICS = [
  { label: 'F1 (issues)', value: '0.77', ci: 'supporting' },
  { label: 'Precision', value: '0.66', ci: '[0.57, 0.74]' },
  { label: 'Recall', value: '0.93', ci: '[0.85, 0.97]' },
  { label: 'Test set', value: '136', ci: 'held-out oracle' },
]

export function BenchmarkSection() {
  return (
    <section id="benchmark" className="scroll-mt-6">
      <h2 className="mb-3 font-mono text-lg font-semibold text-console-text-bright">
        <Target className="mr-2 inline h-4 w-4 text-console-green" />
        Honest numbers
      </h2>
      <p className="mb-4 max-w-3xl font-mono text-sm text-console-text-dim">
        <strong className="text-console-text-bright">Track A (primary):</strong> production{' '}
        <code className="text-console-text-bright/80">scorePr()</code> /{' '}
        <code className="text-console-text-bright/80">scanComments()</code> on N=87 labeled fixtures
        (13 hand-labeled + disclosed programmatic expansion).{' '}
        <strong className="text-console-text-bright">Issues (supporting):</strong> frozen 70/30 split
        on microsoft/vscode, facebook/react, rust-lang/rust with a content oracle — Tier-4 baseline.
      </p>
      <p className="mb-2 font-mono text-xs uppercase tracking-wide text-console-text-dim">
        Track A — PR / commit / comments
      </p>
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {TRACK_A_METRICS.map((m) => (
          <Card key={m.label} className="border-console-border bg-console-panel shadow-console">
            <CardContent className="p-4">
              <div className="font-mono text-[11px] uppercase tracking-wide text-console-text-dim">
                {m.label}
              </div>
              <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-console-text-bright">
                {m.value}
              </div>
              <div className="font-mono text-[11px] text-console-text-dim">{m.ci}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="mb-2 font-mono text-xs uppercase tracking-wide text-console-text-dim">
        Issues — supporting benchmark
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {ISSUE_METRICS.map((m) => (
          <Card key={m.label} className="border-console-border bg-console-panel shadow-console">
            <CardContent className="p-4">
              <div className="font-mono text-[11px] uppercase tracking-wide text-console-text-dim">
                {m.label}
              </div>
              <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-console-text-bright">
                {m.value}
              </div>
              <div className="font-mono text-[11px] text-console-text-dim">{m.ci}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="mt-3 font-mono text-xs text-console-text-dim">
        See <code className="text-console-text-bright/80">bench/PR-REPORT.md</code> (Track A) and{' '}
        <code className="text-console-text-bright/80">bench/REPORT.md</code> (issues) for methodology
        and false-negative disclosure.
      </p>
    </section>
  )
}
