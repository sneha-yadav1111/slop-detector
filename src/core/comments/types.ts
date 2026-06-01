// src/core/comments/types.ts
// Track A (Code Review) — hollow code-comment detection DTOs.
//
// A code comment is "slop" when it occupies space but conveys nothing a reader
// could not get from the code itself: it restates the next line, states the
// obvious, or is generic AI boilerplate ("// This function ...") with no specifics.
//
// Pure module: NO octokit / fs / LLM imports anywhere under src/core/comments/.

/** Supported source languages for comment extraction. */
export type CommentLang =
  | 'js' // JavaScript / TypeScript / Java / C / C++ / C# / Go / Rust / Swift / Kotlin
  | 'py' // Python / Ruby / Shell / YAML (# line comments)
  | 'auto'

/** A single extracted comment with the line of code it annotates. */
export interface ExtractedComment {
  /** The comment text, leading markers (// # /* ) stripped. */
  text: string
  /** 1-based line where the comment starts. */
  line: number
  /** The first non-blank line of code AFTER the comment, if any (for restatement checks). */
  nextCode: string | null
  /** True when this is a block comment ( / * ... * / or """ ... """). */
  block: boolean
}

/** Why a single comment was flagged as hollow. */
export type CommentSlopReason =
  | 'restates-code' // paraphrases the very next line
  | 'states-obvious' // "// constructor", "// getter", "// loop"
  | 'ai-boilerplate' // generic "This function/method/class ..." filler
  | 'tautology' // "// increment i" above `i++`
  | 'empty-or-marker' // "// TODO" with nothing, banner lines

/** Per-comment verdict. */
export interface CommentVerdict {
  text: string
  line: number
  isSlop: boolean
  reasons: CommentSlopReason[]
}

/** Aggregate result of scanning a source blob for hollow comments. */
export interface CommentScanResult {
  /** Total comments examined. */
  total: number
  /** Comments judged hollow. */
  slopCount: number
  /** slopCount / total (0 when no comments). */
  slopRatio: number
  /** Per-comment verdicts (only those examined; banners/license headers skipped). */
  verdicts: CommentVerdict[]
}
