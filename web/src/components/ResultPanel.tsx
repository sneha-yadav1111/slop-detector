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
import { Badge } from './ui/badge'
import { Card, CardContent } from './ui/card'
import { Separator } from './ui/separator'

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
  const v = VERDICT_META[result.verdict]

  return (
    <Card className="animate-in-up overflow-hidden border-console-border shadow-console">
      <div className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="border-console-border bg-console-panel font-mono text-[10px] uppercase tracking-wide text-console-text-dim"
            >
              {result.kind === 'pr' ? 'Pull request' : result.kind === 'code' ? 'Code' : 'Issue'}
            </Badge>
            <Badge
              variant="secondary"
              className="border-console-border bg-console-panel font-mono text-[10px] text-console-text-dim"
            >
              {SOURCE_LABEL[result.source] ?? result.source}
            </Badge>
            <Badge
              variant={v.badge}
              className={`font-mono text-[10px] uppercase tracking-wide ${
                result.verdict === 'clean'
                  ? 'border-console-green/30 bg-console-green/10 text-console-green'
                  : result.verdict === 'gray'
                    ? 'border-console-amber/30 bg-console-amber/10 text-console-amber'
                    : 'border-console-red/30 bg-console-red/10 text-console-red'
              }`}
            >
              <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${v.dot}`} />
              {v.label}
            </Badge>
            {result.kind !== 'code' && result.llmUsed && (
              <Badge className="border-console-green/30 bg-console-green/10 font-mono text-[10px] text-console-green">
                <Sparkles className="mr-1 h-3 w-3" /> LLM adjudicated
              </Badge>
            )}
          </div>
          <h3 className="mt-3 min-w-0 text-xl font-semibold text-console-text-bright">
            {meta.url ? (
              <a
                href={meta.url}
                target="_blank"
                rel="noreferrer"
                className="flex min-w-0 items-center gap-1.5 hover:text-console-green"
              >
                <span className="truncate">{meta.title}</span>
                <ExternalLink className="h-4 w-4 shrink-0" />
              </a>
            ) : (
              <div className="truncate">{meta.title}</div>
            )}
          </h3>
          <p className="mt-1 font-mono text-sm text-console-text-dim">
            {meta.repo ? `${meta.repo}#${meta.number} · ` : ''}
            {meta.author ? `@${meta.author}` : 'local content'}
          </p>
        </div>
        <div className="flex shrink-0 items-center justify-center">
          <SlopGauge slopScore={result.slopScore} verdict={result.verdict} />
        </div>
      </div>

      <Separator className="bg-console-border" />

      <CardContent className="space-y-6 pt-6">
        {result.findings.length > 0 && (
          <Findings findings={result.findings} verdict={result.verdict} />
        )}
        {result.kind === 'issue' && <IssueDetails result={result} />}
        {result.kind === 'pr' && <PrDetails result={result} />}
        {result.kind === 'code' && <CodeDetails result={result} />}
      </CardContent>
    </Card>
  )
}

function Findings({ findings, verdict }: { findings: string[]; verdict: ScanResult['verdict'] }) {
  const Icon = verdict === 'clean' ? CheckCircle2 : verdict === 'gray' ? AlertTriangle : XCircle
  const tone =
    verdict === 'clean'
      ? 'text-console-green'
      : verdict === 'gray'
        ? 'text-console-amber'
        : 'text-console-red'
  return (
    <Section title="What a reviewer would notice">
      <ul className="space-y-2">
        {findings.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm text-console-text-bright/90">
            <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${tone}`} />
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </Section>
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
        <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg border border-console-border bg-console-panel p-4 font-mono text-xs leading-relaxed text-console-text-dim">
          {comment}
        </pre>
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
                className={`flex items-start gap-2 rounded-lg border px-3 py-2 font-mono text-xs ${
                  c.isSlop
                    ? 'border-console-red/30 bg-console-red/5 text-console-red'
                    : 'border-console-border bg-console-panel/60 text-console-text-dim'
                }`}
              >
                <GitCommit className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0">
                  <span className="break-words">{c.message || '(empty)'}</span>
                  {c.reasons.length > 0 && (
                    <span className="mt-0.5 block text-[11px] text-console-text-dim">
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
          <p className="text-sm text-console-text-dim">No comments found in this source.</p>
        ) : (
          <ul className="space-y-1.5">
            {scored.verdicts.map((v) => (
              <li
                key={`${v.line}-${v.text}`}
                className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs font-mono ${
                  v.isSlop
                    ? 'border-console-red/30 bg-console-red/5'
                    : 'border-console-border bg-console-panel/60'
                }`}
              >
                {v.isSlop ? (
                  <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-console-red" />
                ) : (
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-console-green" />
                )}
                <span className="min-w-0">
                  <span className="font-mono text-console-text-bright/90">
                    L{v.line}: "{v.text}"
                  </span>
                  {v.reasons.length > 0 && (
                    <span className="mt-0.5 block text-[11px] text-console-text-dim">
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
        <li key={m} className="flex items-start gap-2.5 text-sm text-console-text-bright/90">
          <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-console-text-dim" />
          <span>{m}</span>
        </li>
      ))}
    </ul>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-4 border-b border-console-border/50 pb-2 font-mono text-xs font-semibold uppercase tracking-wide text-console-text-dim">
        {title}
      </h4>
      {children}
    </div>
  )
}
