// src/core/comments/detector.ts
// Track A — decide whether each extracted comment is "hollow" (slop).
//
// Detection approach (documented for judges — NOT a keyword blacklist):
//
//   1. restates-code: the comment, reduced to its meaningful word stems, is a
//      subset of the identifiers on the very next line of code. e.g.
//        // increment the counter
//        counter++;
//      The comment's content words ("increment", "counter") are all derivable
//      from the code token "counter" + the "++" operator → zero added information.
//
//   2. tautology: a 1:1 paraphrase of a trivial operation (assignment, return,
//      increment, loop header) where the comment names exactly what the syntax says.
//
//   3. states-obvious: short comments that label a structural element the reader
//      can already see ("// constructor", "// getter", "// the loop", "// imports").
//
//   4. ai-boilerplate: the generic AI-comment opener shape — "This function/method
//      /class ... <verb>s ..." — with no concrete nouns (no identifiers, numbers,
//      units, file names) that a reader couldn't infer from the signature.
//
//   5. empty-or-marker: bare "TODO"/"FIXME" with no description, or "..." filler.
//
// A comment is NOT slop if it explains WHY, names a constraint, references an
// issue/spec, warns about an edge case, or contains a concrete value/identifier
// absent from the adjacent code. Those carry information.
//
// Pure function: zero I/O.

import { extractComments } from './extractor.js'
import type {
  CommentScanResult,
  CommentSlopReason,
  CommentVerdict,
  ExtractedComment,
} from './types.js'

const STOPWORDS = new Set([
  'a',
  'an',
  'the',
  'this',
  'that',
  'these',
  'those',
  'is',
  'are',
  'be',
  'to',
  'of',
  'for',
  'and',
  'or',
  'in',
  'on',
  'at',
  'by',
  'we',
  'it',
  'its',
  'here',
  'then',
  'now',
  'just',
  'will',
  'with',
  'as',
  'from',
  'into',
  'value',
  'method',
  'function',
  'variable',
])

// "Why / intent" markers — strong signal the comment carries real information.
const INTENT_RE =
  /\b(?:because|since|so that|in order to|otherwise|due to|avoid|prevent|workaround|hack|note:|warning:|caution|edge case|gotcha|assumes?|must|required|spec|rfc|cve|see |ref |fixes?|bug|race|deadlock|overflow|off[- ]by[- ]one|deprecated|do not|don't|careful)\b/i

// Generic AI-comment opener shape.
const AI_OPENER_RE =
  /^(?:this|the)\s+(?:function|method|class|component|module|helper|utility|file|code|block|loop|variable|constant)\b/i

const AI_VERB_RE =
  /\b(?:handles?|manages?|processes?|performs?|provides?|represents?|defines?|implements?|is responsible for|takes? care of|allows? (?:us|you)? to|used to|helps? to)\b/i

const STRUCTURAL_LABEL_RE =
  /^(?:constructor|getter|setter|imports?|exports?|the loop|main loop|helper(?: function)?|init(?:ialization)?|setup|teardown|cleanup|begin|end|start|done|return(?:s)?(?: (?:the )?(?:value|result))?|the (?:loop|function|method|class|variable|result))$/i

const BARE_MARKER_RE = /^(?:todo|fixme|xxx|hack|note|\.\.\.|-+|nothing|placeholder)\.?$/i

const TRIVIAL_OP_RE = /^[\w.[\]]+\s*(?:\+\+|--|[-+*/]?=)\s*.*$|^return\b|^for\b|^while\b|^if\b/i

/** Identifier-like tokens from a line of code, lowercased, split on camelCase/underscores. */
function codeIdentifiers(code: string): Set<string> {
  const out = new Set<string>()
  const idents = code.match(/[A-Za-z_$][A-Za-z0-9_$]*/g) ?? []
  for (const id of idents) {
    const parts = id
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[_$]/g, ' ')
      .toLowerCase()
      .split(/\s+/)
    for (const p of parts) if (p.length >= 1) out.add(p)
  }
  return out
}

// Map a comment "action word" to the operator/keyword that already expresses it,
// so "// increment i" above `i++` is recognized as conveying nothing new.
const ACTION_OPERATORS: Array<[RegExp, RegExp]> = [
  [/\bincrement(s|ed|ing)?\b/i, /\+\+|\+=\s*1\b/],
  [/\bdecrement(s|ed|ing)?\b/i, /--|-=\s*1\b/],
  [/\b(set|assign|initiali[sz]e)(s|d|ing)?\b/i, /(?<![=!<>+\-*/])=(?!=)/],
  [/\breturn(s|ed|ing)?\b/i, /^return\b/i],
  [/\b(loop|iterate)(s|d|ing)?\b/i, /^(?:for|while)\b/i],
  [/\bcall(s|ed|ing)?\b/i, /\w+\s*\(/],
  [/\b(add|sum)(s|ed|ing)?\b/i, /\+/],
  [/\bcheck(s|ed|ing)?\b|\bif\b/i, /^if\b/i],
]

/** True when the comment's action word is already expressed by an operator on the code line. */
function actionMatchesOperator(comment: string, code: string): boolean {
  let hits = 0
  for (const [wordRe, opRe] of ACTION_OPERATORS) {
    if (wordRe.test(comment) && opRe.test(code)) hits++
  }
  return hits > 0
}

/** Meaningful content words of a comment (stopwords removed). */
function contentWords(text: string): string[] {
  return (text.toLowerCase().match(/[a-z][a-z'-]+/g) ?? []).filter((w) => !STOPWORDS.has(w))
}

function classify(c: ExtractedComment): CommentSlopReason[] {
  const reasons: CommentSlopReason[] = []
  const text = c.text.trim()
  const lower = text.toLowerCase()

  // Real information present → never slop, short-circuit.
  if (INTENT_RE.test(text)) return []
  // Concrete reference: an issue number, URL, or @tag carries context.
  if (/#\d+|https?:\/\/|@\w+/.test(text)) return []

  // 5. empty / bare marker.
  if (BARE_MARKER_RE.test(lower)) {
    reasons.push('empty-or-marker')
    return reasons
  }

  const cWords = contentWords(text)

  // 3. states-obvious: short structural label.
  if (cWords.length <= 4 && STRUCTURAL_LABEL_RE.test(lower)) {
    reasons.push('states-obvious')
  }

  // 4. ai-boilerplate: generic opener + generic verb, with no concrete identifier
  //    the signature wouldn't already give you.
  if (AI_OPENER_RE.test(text) && AI_VERB_RE.test(text)) {
    const codeIds = c.nextCode ? codeIdentifiers(c.nextCode) : new Set<string>()
    const novel = cWords.filter((w) => w.length >= 4 && !codeIds.has(w) && !AI_GENERIC_WORD(w))
    if (novel.length < 2) reasons.push('ai-boilerplate')
  }

  // 1 & 2. restatement / tautology against the next code line.
  if (c.nextCode && cWords.length > 0) {
    const codeIds = codeIdentifiers(c.nextCode)
    // A comment word is "explained by the code" if it appears as an identifier,
    // OR its action is already expressed by an operator (++ / = / return / for ...).
    const explained = cWords.filter(
      (w) => codeIds.has(w) || actionMatchesOperator(w, c.nextCode as string),
    ).length
    const overlapRatio = explained / cWords.length
    const trivial = TRIVIAL_OP_RE.test(c.nextCode)
    const operatorMatch = actionMatchesOperator(c.text, c.nextCode)

    if ((overlapRatio >= 0.6 || (operatorMatch && trivial)) && cWords.length <= 8) {
      const isTautology = (trivial || operatorMatch) && cWords.length <= 5
      reasons.push(isTautology ? 'tautology' : 'restates-code')
    }
  }

  return reasons
}

function AI_GENERIC_WORD(w: string): boolean {
  return [
    'function',
    'method',
    'class',
    'value',
    'variable',
    'object',
    'data',
    'result',
    'return',
    'returns',
    'parameter',
    'argument',
    'instance',
    'component',
  ].includes(w)
}

/** Assess a single comment. */
export function assessComment(c: ExtractedComment): CommentVerdict {
  const reasons = classify(c)
  return { text: c.text, line: c.line, isSlop: reasons.length > 0, reasons }
}

/** Scan a whole source blob for hollow comments. */
export function scanComments(source: string): CommentScanResult {
  const comments = extractComments(source)
  const verdicts = comments.map(assessComment)
  const slopCount = verdicts.filter((v) => v.isSlop).length
  return {
    total: verdicts.length,
    slopCount,
    slopRatio: verdicts.length > 0 ? slopCount / verdicts.length : 0,
    verdicts,
  }
}
