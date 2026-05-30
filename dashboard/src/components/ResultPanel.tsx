'use client'

import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  ExternalLink,
  GitCommit,
  Sparkles,
  XCircle,
} from 'lucide-react'
import type { ScanResult } from '@/lib/types'
import { VERDICT_META } from '@/lib/verdict'
import { SignalChip } from './SignalChip'
import { SlopGauge } from './SlopGauge'

const ISSUE_SIGNAL_LABELS: Record<string, string> = {
  hasCodeBlock: 'Code block',
  hasStackTrace: 'Stack trace',
  hasVersionMention: 'Version',
  hasReproKeywords: 'Repro steps',
  hasExpectedActual: 'Expected vs actual',
  hasMinimalExample: 'Minimal example',
  hasImageOnly: 'Image-only',
}
const ISSUE_NEGATIVE = new Set(['hasImageOnly'])

const PR_SIGNAL_LABELS: Record<string, string> = {
  hasMotivation: 'Motivation / why',
  hasTestingNotes: 'Testing notes',
  hasIssueLink: 'Linked issue',
  hasRiskNotes: 'Risk / trade-offs',
  hasGenericBoilerplate: 'AI boilerplate',
  isDiffRestating: 'Restates diff',
  isThin: 'Thin description',
  isChangelogOnly: 'Changelog only',
  hasHunkOverlap: 'Hunk overlap',
  missingTestsMention: 'Tests not mentioned',
  requiresRiskNotes: 'Risk notes required',
}
const PR_NEGATIVE = new Set([
  'hasGenericBoilerplate',
  'isDiffRestating',
  'isThin',
  'isChangelogOnly',
  'hasHunkOverlap',
  'missingTestsMention',
  'requiresRiskNotes',
])

const SOURCE_LABEL: Record<string, string> = {
  github: 'Live · GitHub',
  paste: 'Pasted',
  fixture: 'Fixture',
}

export function ResultPanel({ result }: { result: ScanResult }) {
  const { meta } = result

  const headerBg =
    result.verdict === 'clean'
      ? 'border-b border-signal-cyan/30 bg-signal-cyan/5 px-5 py-4'
      : result.verdict === 'gray'
        ? 'border-b border-signal-amber/30 bg-signal-amber/5 px-5 py-4'
        : 'border-b border-signal-red/30 bg-signal-red/5 px-5 py-4'

  const verdictBadgeColor =
    result.verdict === 'clean'
      ? 'border-signal-cyan text-signal-cyan'
      : result.verdict === 'gray'
        ? 'border-signal-amber text-signal-amber'
        : 'border-signal-red text-signal-red'

  return (
    <div className="bracket-card bg-signal-surface border border-signal-border rounded-sm overflow-hidden">
      {/* Header */}
      <div className={`flex items-center justify-between ${headerBg}`}>
        <div className="flex items-center gap-3 min-w-0">
          <span className="px-2 py-0.5 text-[10px] font-data tracking-widest uppercase border border-signal-border text-signal-text-mute rounded-sm shrink-0">
            {result.kind === 'pr' ? 'Pull request' : result.kind === 'code' ? 'Code' : 'Issue'}
          </span>
          {meta.url ? (
            <a
              href={meta.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 font-display font-semibold text-base text-signal-white truncate hover:text-signal-cyan transition-colors"
            >
              <span className="truncate">{meta.title}</span>
              <ExternalLink className="h-4 w-4 shrink-0" />
            </a>
          ) : (
            <span className="font-display font-semibold text-base text-signal-white truncate">
              {meta.title}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-data text-[10px] text-signal-text-mute">
            {SOURCE_LABEL[result.source] ?? result.source}
          </span>
          {result.kind !== 'code' && result.llmUsed && (
            <span className="px-2 py-0.5 text-[10px] font-data tracking-widest uppercase border border-signal-cyan/40 text-signal-cyan rounded-sm">
              LLM
            </span>
          )}
          <span className={`font-display font-bold text-sm tracking-widest px-3 py-1 rounded-sm border uppercase ${verdictBadgeColor}`}>
            {VERDICT_META[result.verdict].label}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="grid grid-cols-[200px_1fr] divide-x divide-signal-border">
        {/* Left pane */}
        <div className="p-5 space-y-4">
          <SlopGauge slopScore={result.slopScore} verdict={result.verdict} />
          {result.findings.length > 0 && (
            <Findings findings={result.findings} verdict={result.verdict} />
          )}
        </div>

        {/* Right pane */}
        <div className="p-5 space-y-5">
          {result.kind === 'issue' && <IssueDetails result={result} />}
          {result.kind === 'pr' && <PrDetails result={result} />}
          {result.kind === 'code' && <CodeDetails result={result} />}
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-signal-border flex items-center justify-between bg-signal-surface">
        <span className="font-data text-xs text-signal-text-mute">
          Slop Detector v2 · Signal Intelligence
        </span>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1 rounded-sm border border-signal-border text-xs font-data text-signal-text-dim hover:border-signal-cyan hover:text-signal-cyan transition-colors">
            Copy
          </button>
          <button className="px-3 py-1 rounded-sm border border-signal-border text-xs font-data text-signal-text-dim hover:border-signal-cyan hover:text-signal-cyan transition-colors">
            Re-scan
          </button>
        </div>
      </div>
    </div>
  )
}

function Findings({ findings, verdict }: { findings: string[]; verdict: ScanResult['verdict'] }) {
  const iconContainer =
    verdict === 'clean'
      ? 'w-4 h-4 rounded-sm bg-signal-cyan/10 text-signal-cyan flex items-center justify-center shrink-0'
      : verdict === 'slop'
        ? 'w-4 h-4 rounded-sm bg-signal-red/10 text-signal-red flex items-center justify-center shrink-0'
        : 'w-4 h-4 rounded-sm bg-signal-amber/10 text-signal-amber flex items-center justify-center shrink-0'

  const Icon = verdict === 'clean' ? CheckCircle2 : verdict === 'gray' ? AlertTriangle : XCircle

  return (
    <div>
      <h4 className="font-data text-[10px] uppercase tracking-widest text-signal-text-mute mb-3">
        What a reviewer would notice
      </h4>
      <ul className="space-y-2">
        {findings.map((f) => (
          <li key={f} className="flex items-center gap-2 text-xs">
            <span className={iconContainer}>
              <Icon className="w-3 h-3" />
            </span>
            <span className="text-signal-text-dim">{f}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function IssueDetails({ result }: { result: Extract<ScanResult, { kind: 'issue' }> }) {
  const { scored, comment } = result
  return (
    <>
      <Section title="Signals detected">
        <div className="flex flex-wrap gap-2">
          {Object.entries(scored.signals).map(([k, val]) => (
            <SignalChip
              key={k}
              label={ISSUE_SIGNAL_LABELS[k] ?? k}
              active={Boolean(val)}
              negative={ISSUE_NEGATIVE.has(k)}
            />
          ))}
        </div>
      </Section>

      {scored.missing.length > 0 && (
        <Section title="Missing-info checklist">
          <Checklist items={scored.missing} />
        </Section>
      )}

      <Section title="Comment the Action would post">
        <div className="bg-signal-bg border border-signal-border rounded-sm p-4 mt-2">
          <div className="font-data text-xs text-signal-text-dim whitespace-pre-wrap">
            {comment}
          </div>
        </div>
      </Section>
    </>
  )
}

function PrDetails({ result }: { result: Extract<ScanResult, { kind: 'pr' }> }) {
  const { scored } = result
  const slopCommits = scored.commits.filter((c) => c.isSlop)
  return (
    <>
      <Section title="Description signals">
        <div className="flex flex-wrap gap-2">
          {Object.entries(scored.signals).map(([k, val]) => (
            <SignalChip
              key={k}
              label={PR_SIGNAL_LABELS[k] ?? k}
              active={Boolean(val)}
              negative={PR_NEGATIVE.has(k)}
            />
          ))}
        </div>
      </Section>

      {scored.commits.length > 0 && (
        <Section
          title={`Commit messages · ${slopCommits.length}/${scored.commits.length} flagged (${Math.round(scored.commitSlopRatio * 100)}%)`}
        >
          <ul className="space-y-1.5">
            {scored.commits.map((c, i) => (
              <li
                key={`${i}-${c.message}`}
                className={`flex items-start gap-2 rounded-sm border px-3 py-2 text-xs font-data ${
                  c.isSlop
                    ? 'border-signal-red/30 bg-signal-red/5 text-signal-red'
                    : 'border-signal-border bg-signal-surface/60 text-signal-text-dim'
                }`}
              >
                <GitCommit className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0">
                  <span className="break-words">{c.message || '(empty)'}</span>
                  {c.reasons.length > 0 && (
                    <span className="mt-0.5 block text-[11px] text-signal-text-mute">
                      {c.reasons.join(' · ')}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {scored.missing.length > 0 && (
        <Section title="What would make this reviewer-ready">
          <Checklist items={scored.missing} />
        </Section>
      )}
    </>
  )
}

function CodeDetails({ result }: { result: Extract<ScanResult, { kind: 'code' }> }) {
  const { scored } = result
  return (
    <>
      <Section
        title={`Comments · ${scored.slopCount}/${scored.total} hollow (${Math.round(scored.slopRatio * 100)}%)`}
      >
        {scored.verdicts.length === 0 ? (
          <p className="text-sm text-signal-text-dim">No comments found in this source.</p>
        ) : (
          <ul className="space-y-1.5">
            {scored.verdicts.map((v) => (
              <li
                key={`${v.line}-${v.text}`}
                className={`flex items-start gap-2 rounded-sm border px-3 py-2 text-xs font-data ${
                  v.isSlop
                    ? 'border-signal-red/30 bg-signal-red/5'
                    : 'border-signal-border bg-signal-surface/60'
                }`}
              >
                {v.isSlop ? (
                  <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-signal-red" />
                ) : (
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-signal-cyan" />
                )}
                <span className="min-w-0">
                  <span className="font-data text-signal-white">
                    L{v.line}: &quot;{v.text}&quot;
                  </span>
                  {v.reasons.length > 0 && (
                    <span className="mt-0.5 block text-[11px] text-signal-text-mute">
                      {v.reasons.join(' · ')}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {result.suggestions.length > 0 && (
        <Section title="How to fix">
          <Checklist items={result.suggestions} />
        </Section>
      )}
    </>
  )
}

function Checklist({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((m) => (
        <li key={m} className="flex items-start gap-2.5 text-sm text-signal-white/90">
          <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-signal-text-mute" />
          <span>{m}</span>
        </li>
      ))}
    </ul>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="font-data text-[10px] uppercase tracking-widest text-signal-text-mute mb-3">
        {title}
      </h4>
      {children}
    </div>
  )
}
