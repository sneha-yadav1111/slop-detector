import {
  ScanLine,
  GitPullRequest,
  MessageSquare,
  Code2,
  ArrowRight,
  Check,
  Activity,
  BarChart3,
  BookOpen,
  Cpu,
} from 'lucide-react'
import Link from 'next/link'
import { LogoBadge } from '@/components/Logo'
import { SlopGauge } from '@/components/SlopGauge'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-signal-bg">

      {/* ── TOP NAV ── */}
      <header className="sticky top-0 z-50 border-b border-signal-border bg-signal-bg/80 backdrop-blur-md">
        <div className="flex items-center justify-between h-14 max-w-7xl mx-auto px-6">
          <div className="flex items-center gap-2">
            <LogoBadge className="w-7 h-7" size={18} variant="solid" />
            <span className="font-display font-bold text-base tracking-tight">
              <span className="text-signal-white">SLOP</span>
              <span className="text-signal-cyan">DETECTOR</span>
            </span>
          </div>
          <nav className="flex items-center gap-6">
            <Link href="/how-it-works" className="font-data text-xs text-signal-text-dim hover:text-signal-white tracking-widest uppercase transition-colors">
              Methodology
            </Link>
            <a href="https://github.com/sneha-yadav1111/slop-scan" target="_blank" rel="noopener noreferrer" className="font-data text-xs text-signal-text-dim hover:text-signal-white tracking-widest uppercase transition-colors">
              GitHub
            </a>
            <Link href="/app" className="h-8 px-4 rounded bg-signal-cyan text-signal-bg font-display font-bold text-xs tracking-wide hover:bg-white hover:shadow-glow-cyan transition-all">
              OPEN SCANNER →
            </Link>
          </nav>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="relative min-h-[88vh] flex items-center overflow-hidden">
        {/* Right diagonal panel */}
        <div
          className="absolute right-0 top-0 bottom-0 w-[45%] bg-signal-surface"
          style={{ clipPath: 'polygon(8% 0, 100% 0, 100% 100%, 0 100%)' }}
        />

        {/* Left content */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 py-24 grid grid-cols-[55%_45%] gap-0 items-center w-full">
          <div className="pr-12 space-y-7 animate-mount">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-signal-border-hot text-signal-cyan text-[10px] font-data tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-signal-cyan animate-pulse-slow" />
              AI SIGNAL INTELLIGENCE · OPEN SOURCE
            </div>
            <h1 className="font-display font-extrabold text-6xl leading-[1.05] tracking-tight">
              <span className="text-signal-white block">DETECT</span>
              <span className="text-signal-cyan block">AI-GENERATED</span>
              <span className="text-signal-white block">SLOP IN YOUR</span>
              <span className="text-signal-white block">CODEBASE</span>
            </h1>
            <p className="text-signal-text-dim text-lg max-w-md leading-relaxed font-light">
              Scores information density in PRs, commits, code comments, and issues.
              Not &quot;was this AI?&quot; — but &quot;does this carry any information a reviewer needs?&quot;
            </p>
            <div className="flex items-center gap-4">
              <Link href="/app" className="h-11 px-6 rounded bg-signal-cyan text-signal-bg font-display font-bold text-sm tracking-wider hover:bg-white hover:shadow-glow-cyan transition-all inline-flex items-center gap-2">
                SCAN YOUR REPO <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/how-it-works" className="h-11 px-6 rounded border border-signal-border text-signal-text-dim font-data text-xs tracking-widest uppercase hover:border-signal-cyan hover:text-signal-white transition-all inline-flex items-center">
                HOW IT WORKS
              </Link>
            </div>
            <div className="p-3 rounded bg-signal-surface border border-signal-border max-w-sm">
              <p className="font-data text-[10px] text-signal-text-mute mb-1 uppercase tracking-widest">GitHub Action</p>
              <code className="font-data text-xs text-signal-cyan">uses: sneha-yadav1111/slop-scan</code>
            </div>
          </div>

          {/* Right: live demo card */}
          <div className="relative pl-12 flex justify-center">
            <div className="bracket-card scan-sweep bg-signal-surface-2 border border-signal-border rounded-sm p-6 w-full max-w-sm stagger-2 animate-mount">
              <div className="flex items-center justify-between mb-4">
                <span className="font-data text-[10px] uppercase tracking-widest text-signal-text-mute">Live Analysis Preview</span>
                <span className="font-data text-[10px] px-2 py-0.5 rounded border border-signal-red/40 bg-signal-red/10 text-signal-red uppercase tracking-wide">Slop Detected</span>
              </div>
              <div className="flex justify-center my-4">
                <SlopGauge slopScore={82} verdict="slop" />
              </div>
              <div className="space-y-2 mt-4">
                {['Diff-restating description', 'No motivation or why', 'Generic commit messages', 'Missing test coverage notes'].map(f => (
                  <div key={f} className="flex items-center gap-2 text-xs">
                    <div className="w-4 h-4 rounded-sm bg-signal-red/10 text-signal-red flex items-center justify-center shrink-0">
                      <span className="text-[10px]">✕</span>
                    </div>
                    <span className="text-signal-text-dim">{f}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-signal-border flex items-center justify-between">
                <span className="font-data text-[10px] text-signal-text-mute">VERDICT</span>
                <span className="font-display font-bold text-sm text-signal-red tracking-widest">SLOP</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <div className="border-y border-signal-border bg-signal-surface">
        <div className="grid grid-cols-4 divide-x divide-signal-border max-w-7xl mx-auto">
          {[
            { icon: Activity, label: 'Scans Run', value: '12,400+', color: 'text-signal-cyan' },
            { icon: BarChart3, label: 'Slop Caught', value: '4,100+', color: 'text-signal-red' },
            { icon: Cpu, label: 'F1 Score (PRs)', value: '0.90', color: 'text-signal-amber' },
            { icon: ScanLine, label: 'Avg Latency', value: '<150ms', color: 'text-signal-cyan' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="flex items-center gap-4 px-8 py-6">
              <div className={`w-10 h-10 hex-icon bg-signal-surface-2 flex items-center justify-center ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <div className={`font-display font-bold text-2xl ${color}`}>{value}</div>
                <div className="font-data text-[10px] uppercase tracking-wide text-signal-text-mute">{label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── DETECTION MODULES ── */}
      <section className="py-24 max-w-7xl mx-auto px-6">
        <div className="text-center mb-14">
          <div className="font-data text-[10px] uppercase tracking-widest text-signal-cyan mb-3">Detection Modules</div>
          <h2 className="font-display font-extrabold text-4xl text-signal-white tracking-tight">
            Three Layers of Signal Intelligence
          </h2>
        </div>
        <div className="grid grid-cols-3 gap-6">
          {[
            { icon: GitPullRequest, accent: 'signal-cyan', label: 'PR Information Density', desc: 'Structural + lexical analysis: motivation, testing, hunk overlap, diff-restatement, thinness.', tags: ['Motivation', 'Hunk Overlap', 'Boilerplate', 'Thinness'], score: '78', verdict: 'slop' as const },
            { icon: MessageSquare, accent: 'signal-amber', label: 'Issue Actionability', desc: '7 binary content signals: code block, stack trace, version, repro steps, expected/actual, minimal example.', tags: ['Stack Trace', 'Version', 'Repro', 'Code Block'], score: '45', verdict: 'gray' as const },
            { icon: Code2, accent: 'signal-red', label: 'Hollow Comment Detection', desc: 'Pairs each comment with the line it annotates. Flags restatement, tautology, and boilerplate.', tags: ['Restatement', 'Tautology', 'Boilerplate', 'Why-less'], score: '12', verdict: 'clean' as const },
          ].map(({ icon: Icon, accent, label, desc, tags, score, verdict }) => (
            <div key={label} className={`bracket-card scan-sweep bg-signal-surface border border-signal-border rounded-sm p-6 hover:border-signal-border-hot transition-colors group`}>
              <div className={`w-10 h-10 hex-icon bg-${accent}/10 text-${accent} flex items-center justify-center mb-4`}>
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="font-display font-bold text-base text-signal-white mb-2">{label}</h3>
              <p className="text-signal-text-dim text-sm leading-relaxed mb-4">{desc}</p>
              <div className="flex flex-wrap gap-1 mb-4">
                {tags.map(t => (
                  <span key={t} className="font-data text-[9px] px-2 py-0.5 border border-signal-border text-signal-text-mute rounded-sm uppercase tracking-wide">{t}</span>
                ))}
              </div>
              <div className={`flex items-center justify-between pt-4 border-t border-signal-border font-data text-xs text-${accent}`}>
                <span>Sample: {score}/100</span>
                <span className="uppercase tracking-widest">{verdict === 'clean' ? 'CLEAN' : verdict === 'gray' ? 'GRAY ZONE' : 'SLOP'}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="bg-signal-surface py-20 border-y border-signal-border">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <div className="font-data text-[10px] uppercase tracking-widest text-signal-cyan mb-3">Pipeline</div>
            <h2 className="font-display font-extrabold text-4xl text-signal-white tracking-tight">Four Steps to a Verdict</h2>
          </div>
          <div className="relative grid grid-cols-4 gap-6">
            <div className="absolute top-8 left-[12%] right-[12%] h-px bg-signal-border" />
            {[
              { n: '01', icon: ScanLine, title: 'Paste or Link', desc: 'Paste PR text or drop a GitHub URL. Live URLs fetch patches and commits.' },
              { n: '02', icon: Cpu, title: 'Signal Extraction', desc: 'Heuristic engine walks structure: hunks, signals, commit quality.' },
              { n: '03', icon: BarChart3, title: 'Score + Verdict', desc: '0–100 slop score. Gray zone optionally adjudicated by LLM (BYOK).' },
              { n: '04', icon: Activity, title: 'Action Comment', desc: 'GitHub Action posts idempotent checklist — helpful tone, no gatekeeping.' },
            ].map(({ n, icon: Icon, title, desc }) => (
              <div key={n} className="relative text-center space-y-3">
                <div className="w-16 h-16 hex-icon bg-signal-surface-2 border border-signal-border text-signal-cyan flex items-center justify-center mx-auto">
                  <Icon className="w-6 h-6" />
                </div>
                <div className="font-data text-[10px] text-signal-text-mute tracking-widest">{n}</div>
                <h3 className="font-display font-bold text-sm text-signal-white">{title}</h3>
                <p className="text-signal-text-dim text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BENCHMARK ── */}
      <section className="py-16 max-w-7xl mx-auto px-6">
        <div className="bracket-card rounded-sm border border-signal-cyan/30 bg-signal-surface-2 p-10">
          <div className="grid grid-cols-2 gap-10 items-start">
            <div>
              <div className="font-data text-[10px] uppercase tracking-widest text-signal-cyan mb-3">Bake-Off Results</div>
              <h2 className="font-display font-extrabold text-3xl text-signal-white tracking-tight mb-4">
                Honest Numbers.<br />Zero Black Box.
              </h2>
              <p className="text-signal-text-dim leading-relaxed mb-4">
                Production detectors on 87 labeled Track-A fixtures. We publish false negatives — 9 borderline cases at score 4/10.
              </p>
              <Link href="/how-it-works" className="font-data text-xs text-signal-cyan tracking-widest uppercase hover:underline">
                Full methodology →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'F1 Score', value: '0.90', sub: 'Track A PRs' },
                { label: 'Precision', value: '1.00', sub: '0% false positives' },
                { label: 'Recall', value: '0.82', sub: '9 FN disclosed' },
                { label: 'Dataset', value: 'N=87', sub: '13 hand-labeled' },
              ].map(({ label, value, sub }) => (
                <div key={label} className="p-4 bg-signal-surface border border-signal-border rounded-sm text-center">
                  <div className="font-data text-[10px] uppercase tracking-widest text-signal-text-mute mb-1">{label}</div>
                  <div className="font-display font-bold text-2xl text-signal-white">{value}</div>
                  <div className="font-data text-[10px] text-signal-text-mute mt-1">{sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="border-y border-signal-border bg-signal-surface py-16 text-center">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="font-display font-extrabold text-4xl text-signal-white tracking-tight mb-4">
            Ready to scan?
          </h2>
          <p className="text-signal-text-dim mb-8">No signup. No hosted backend. Heuristics-first. BYOK optional.</p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/app" className="h-11 px-8 rounded bg-signal-cyan text-signal-bg font-display font-bold text-sm tracking-wider hover:bg-white hover:shadow-glow-cyan transition-all inline-flex items-center gap-2">
              OPEN SCANNER <ArrowRight className="w-4 h-4" />
            </Link>
            <a href="https://github.com/sneha-yadav1111/slop-scan" target="_blank" rel="noopener noreferrer" className="h-11 px-8 rounded border border-signal-border font-data text-xs tracking-widest uppercase text-signal-text-dim hover:border-signal-cyan hover:text-signal-white transition-all inline-flex items-center gap-2">
              VIEW SOURCE
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-signal-border py-10">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-3 items-center">
          <div className="flex items-center gap-2">
            <LogoBadge className="w-6 h-6" size={14} variant="muted" />
            <span className="font-display font-bold text-sm text-signal-white">SLOP DETECTOR</span>
          </div>
          <div className="text-center font-data text-[10px] text-signal-text-mute">
            MIT License · Asteam Black Shadow · Slop Scan 2026
          </div>
          <div className="flex justify-end">
            <a href="https://github.com/sneha-yadav1111/slop-scan" target="_blank" rel="noopener noreferrer" className="font-data text-[10px] uppercase tracking-widest text-signal-text-mute hover:text-signal-white transition-colors">
              GitHub ↗
            </a>
          </div>
        </div>
      </footer>

    </div>
  )
}
