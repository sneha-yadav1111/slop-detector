// PR review checklist comment formatter (Track A).

import { MARKER } from './markdown.js'
import { prVerdictBand, prVerdictLabel } from '../pr/verdict.js'
import type { PrScored } from '../pr/types.js'

const INTRO_HAS_ITEMS =
  'Thanks for opening this pull request! A few things would help reviewers — details below:'
const INTRO_NO_ITEMS =
  'This pull request description looks information-dense — nothing critical missing from a quick scan.'
const CLOSING =
  'Adding context that is not obvious from the diff alone helps reviewers approve with confidence.'

export function formatPr(scored: PrScored, prTitle?: string): string {
  const hasItems = scored.missing.length > 0 || scored.findings.some((f) => f.includes('restates'))
  const intro = hasItems ? INTRO_HAS_ITEMS : INTRO_NO_ITEMS
  const band = prVerdictBand(scored.score)

  const findingsBlock =
    scored.findings.length > 0
      ? `### Findings\n\n${scored.findings.map((f) => `- ${f}`).join('\n')}`
      : ''

  const checklist =
    scored.missing.length > 0
      ? `### Suggested additions\n\n${scored.missing.map((m) => `- [ ] ${m}`).join('\n')}`
      : ''

  const badge = `**Information-density score: ${scored.score}/10** (${prVerdictLabel(band)})`

  const overlap =
    scored.diffOverlapPercent !== undefined
      ? `**Diff overlap estimate:** ${scored.diffOverlapPercent}% of description language echoes the change.`
      : ''

  const commitBlock =
    scored.commitSlopRatio > 0
      ? `**Commit messages:** ${Math.round(scored.commitSlopRatio * 100)}% look like generic filler — consider descriptive messages.`
      : ''

  const reviewBlock =
    scored.reviewCommentFindings && scored.reviewCommentFindings.length > 0
      ? `### Review comments\n\n${scored.reviewCommentFindings.map((f) => `- ${f}`).join('\n')}`
      : ''

  const titleLine = prTitle ? `**PR:** ${prTitle}` : ''

  const sections = [
    intro,
    titleLine,
    findingsBlock,
    checklist,
    badge,
    overlap,
    commitBlock,
    reviewBlock,
    hasItems ? CLOSING : '',
    MARKER,
  ].filter((s) => s.length > 0)

  return sections.join('\n\n')
}
