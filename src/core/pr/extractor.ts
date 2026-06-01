// Track A — extract PrSignals from a pull-request description.

import type { PrSignals, PullRequestInput, SignalEvidence } from './types.js'

const ISSUE_LINK_RE =
  /(?:#\d+)|(?:\b(?:fix(?:e[sd])?|close[sd]?|resolve[sd]?|refs?|see)\b[\s:#-]*#?\d+)|(?:github\.com\/[\w.-]+\/[\w.-]+\/(?:issues|pull)\/\d+)/i

const MOTIVATION_RE =
  /\b(?:why|motivation|because|in order to|the problem|root cause|context|rationale|currently|previously|this fixes|addresses|prevents|so that)\b/i

const TESTING_RE =
  /\b(?:tested?|testing|test plan|verif(?:y|ied|ication)|reproduc|repro steps|manual(?:ly)? checked|added (?:a )?tests?|unit tests?|e2e|screenshots?|how to test|qa)\b/i

const RISK_RE =
  /\b(?:risk|trade-?off|side effect|breaking change|backward[- ]compat|follow-?up|known (?:issue|limitation)|caveat|regress|migration)\b/i

const BOILERPLATE_RE =
  /\b(?:this (?:pr|pull request|change|commit) (?:introduces|adds|implements|updates|refactors|improves|enhances)|the following changes|key changes|summary of changes|changes made|overview of (?:the )?changes)\b/i

const CHANGELOG_HEADING_RE = /^#+\s*summary of changes/im

const FILLER_BULLET_RE =
  /^[\s>*-]*(?:updated?|added?|removed?|refactored?|improved?|changed?|modified?|fixed?)\b.{0,60}$/i

const WORD_RE = /[a-z0-9][a-z0-9'-]*/gi

export interface ExtractResult {
  signals: PrSignals
  evidence: Partial<Record<keyof PrSignals, SignalEvidence>>
  diffOverlapPercent?: number
}

function words(text: string): string[] {
  return text.toLowerCase().match(WORD_RE) ?? []
}

function fileTokens(files: string[]): Set<string> {
  const set = new Set<string>()
  for (const f of files) {
    for (const seg of f.split(/[\\/]/)) {
      const base = seg.replace(/\.[a-z0-9]+$/i, '').toLowerCase()
      for (const part of base.split(/[._-]/)) {
        if (part.length >= 3) set.add(part)
      }
    }
  }
  return set
}

function stripFences(body: string): string {
  return body.replace(/```[\s\S]*?```/g, ' ').replace(/`[^`]*`/g, ' ')
}

function snippetAround(text: string, re: RegExp, max = 80): string | undefined {
  const m = text.match(re)
  if (!m || m.index === undefined) return undefined
  const start = Math.max(0, m.index - 20)
  return text.slice(start, start + max).replace(/\s+/g, ' ').trim()
}

export function extractPrSignals(pr: PullRequestInput): PrSignals {
  return extractPrSignalsDetailed(pr).signals
}

export function extractPrSignalsDetailed(pr: PullRequestInput): ExtractResult {
  const rawBody = pr.body ?? ''
  const prose = stripFences(rawBody)
  const proseWords = words(prose)
  const wordCount = proseWords.length

  const hasIssueLink = ISSUE_LINK_RE.test(rawBody) || ISSUE_LINK_RE.test(pr.title ?? '')
  const hasMotivation = MOTIVATION_RE.test(prose)
  const hasTestingNotes = TESTING_RE.test(prose)
  const hasRiskNotes = RISK_RE.test(prose)
  const hasGenericBoilerplate = BOILERPLATE_RE.test(prose)

  const files = pr.changedFileCount ?? pr.changedFiles?.length ?? 0
  const lines = pr.linesChanged ?? 0
  const expectedMinWords = Math.min(60, Math.max(12, files * 4 + Math.floor(lines / 40)))
  const isThin = wordCount < expectedMinWords

  let isDiffRestating = false
  let diffOverlapPercent: number | undefined

  if (pr.changedFiles && pr.changedFiles.length > 0 && wordCount > 0) {
    const ftoks = fileTokens(pr.changedFiles)
    const changeVerbs = new Set([
      'update',
      'updated',
      'add',
      'added',
      'remove',
      'removed',
      'change',
      'changed',
      'modify',
      'modified',
      'refactor',
      'refactored',
      'fix',
      'fixed',
      'file',
      'files',
      'code',
    ])
    let echoed = 0
    for (const w of proseWords) {
      if (ftoks.has(w) || changeVerbs.has(w)) echoed++
    }
    const echoRatio = echoed / wordCount
    diffOverlapPercent = Math.round(echoRatio * 100)
    const novelWords = proseWords.filter(
      (w) => !ftoks.has(w) && !changeVerbs.has(w) && w.length >= 4,
    ).length
    isDiffRestating = echoRatio >= 0.25 && novelWords < 20 && !hasMotivation
  }

  if (!isDiffRestating) {
    const bulletLines = rawBody
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => /^[*-]\s+/.test(l))
    const fillerBullets = bulletLines.filter((l) => FILLER_BULLET_RE.test(l)).length
    if (bulletLines.length >= 3 && fillerBullets / bulletLines.length >= 0.6 && !hasMotivation) {
      isDiffRestating = true
    }
  }

  let hasHunkOverlap = false
  if (pr.changedHunkTokens && pr.changedHunkTokens.length > 0 && wordCount > 0) {
    const hset = new Set(pr.changedHunkTokens.map((t) => t.toLowerCase()))
    let hit = 0
    for (const w of proseWords) {
      if (hset.has(w)) hit++
    }
    const hunkRatio = hit / wordCount
    if (hunkRatio >= 0.12 && !hasMotivation) {
      hasHunkOverlap = true
      if (!isDiffRestating) isDiffRestating = true
      diffOverlapPercent = Math.max(diffOverlapPercent ?? 0, Math.round(hunkRatio * 100))
    }
  }

  const bulletLines = rawBody
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => /^[*-]\s+/.test(l))
  const fillerBullets = bulletLines.filter((l) => FILLER_BULLET_RE.test(l)).length
  const isChangelogOnly =
    (CHANGELOG_HEADING_RE.test(rawBody) ||
      (bulletLines.length >= 3 && fillerBullets / bulletLines.length >= 0.5)) &&
    !hasMotivation &&
    !hasTestingNotes &&
    !hasRiskNotes

  const missingTestsMention = Boolean(pr.hasTestFileChanges && !hasTestingNotes)
  const requiresRiskNotes = Boolean(pr.touchesSensitivePaths && !hasRiskNotes)

  const signals: PrSignals = {
    hasMotivation,
    hasIssueLink,
    hasTestingNotes,
    isDiffRestating,
    hasGenericBoilerplate,
    isThin,
    hasRiskNotes,
    isChangelogOnly,
    hasHunkOverlap,
    missingTestsMention,
    requiresRiskNotes,
  }

  const evidence: Partial<Record<keyof PrSignals, SignalEvidence>> = {
    hasMotivation: { triggered: hasMotivation, snippet: snippetAround(prose, MOTIVATION_RE) },
    hasTestingNotes: { triggered: hasTestingNotes, snippet: snippetAround(prose, TESTING_RE) },
    hasIssueLink: { triggered: hasIssueLink },
    hasRiskNotes: { triggered: hasRiskNotes, snippet: snippetAround(prose, RISK_RE) },
    hasGenericBoilerplate: {
      triggered: hasGenericBoilerplate,
      snippet: snippetAround(prose, BOILERPLATE_RE),
    },
    isThin: {
      triggered: isThin,
      snippet: `${wordCount} words (expected ~${expectedMinWords}+ for this change size)`,
    },
    isDiffRestating: {
      triggered: isDiffRestating,
      snippet: diffOverlapPercent !== undefined ? `${diffOverlapPercent}% overlap with diff` : undefined,
    },
    isChangelogOnly: { triggered: isChangelogOnly },
    hasHunkOverlap: {
      triggered: hasHunkOverlap,
      snippet: diffOverlapPercent !== undefined ? `${diffOverlapPercent}% hunk token overlap` : undefined,
    },
    missingTestsMention: { triggered: missingTestsMention },
    requiresRiskNotes: { triggered: requiresRiskNotes },
  }

  return { signals, evidence, diffOverlapPercent }
}
