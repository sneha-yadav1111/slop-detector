// src/core/comments/extractor.ts
// Track A — extract comments from a source blob and pair each with the next line
// of code it annotates. Lightweight, language-agnostic lexer (not a full parser):
// we only need comment spans + the following code line, which a regex-free scan
// over lines handles robustly across C-family and #-family languages.
//
// Pure function: zero I/O.

import type { ExtractedComment } from './types.js'

/** Strip leading comment markers and surrounding whitespace from a comment line. */
function stripLineMarker(raw: string): string {
  return raw
    .replace(/^\s*\/\/+/, '') // // and ///
    .replace(/^\s*#+/, '') // # and ##
    .replace(/^\s*\*+/, '') // continuation of a block comment
    .trim()
}

function stripBlockBody(raw: string): string {
  return raw
    .replace(/\/\*+/g, ' ')
    .replace(/\*+\//g, ' ')
    .replace(/^\s*\*+/gm, ' ')
    .replace(/"""|'''/g, ' ')
    .trim()
}

const LICENSE_RE = /\b(copyright|licen[sc]e|spdx|all rights reserved|@author|@license)\b/i
const BANNER_RE = /^[-=*#/_~ ]{6,}$/ // ====== or ------ banner lines

/** First non-blank line at or after index `from`, trimmed. */
function nextCodeLine(lines: string[], from: number): string | null {
  for (let i = from; i < lines.length; i++) {
    const t = lines[i]?.trim() ?? ''
    if (t.length === 0) continue
    // Skip lines that are themselves comments.
    if (t.startsWith('//') || t.startsWith('#') || t.startsWith('*') || t.startsWith('/*')) continue
    return t
  }
  return null
}

/**
 * Extract comments from source. Handles:
 *   - `//` and `#` single-line comments (C-family and Python/Ruby/Shell)
 *   - `/* ... *\/` block comments
 *   - `"""..."""` / `'''...'''` Python docstrings (treated as block comments)
 *
 * License headers and pure banner lines are dropped (they are not "slop" — they
 * are conventional), so they never inflate the slop ratio.
 */
export function extractComments(source: string): ExtractedComment[] {
  const lines = source.split('\n')
  const out: ExtractedComment[] = []

  let inBlock = false
  let blockBuf: string[] = []
  let blockStart = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''
    const trimmed = line.trim()

    if (inBlock) {
      blockBuf.push(line)
      if (/\*\/|"""|'''/.test(line)) {
        inBlock = false
        const text = stripBlockBody(blockBuf.join('\n'))
        if (text && !LICENSE_RE.test(text)) {
          out.push({
            text,
            line: blockStart + 1,
            nextCode: nextCodeLine(lines, i + 1),
            block: true,
          })
        }
        blockBuf = []
      }
      continue
    }

    // Block-comment / docstring start on this line.
    const blockOpen = /\/\*|"""|'''/.exec(trimmed)
    if (blockOpen && !/^\s*\/\//.test(line)) {
      // Single-line block comment?
      const closesSameLine =
        /\/\*[\s\S]*\*\//.test(trimmed) ||
        /"""[\s\S]*"""/.test(trimmed) ||
        /'''[\s\S]*'''/.test(trimmed)
      if (closesSameLine) {
        const text = stripBlockBody(trimmed)
        if (text && !LICENSE_RE.test(text)) {
          out.push({ text, line: i + 1, nextCode: nextCodeLine(lines, i + 1), block: true })
        }
        continue
      }
      inBlock = true
      blockStart = i
      blockBuf = [line]
      continue
    }

    // Single-line comment. Only when the comment marker is not inside a string.
    const lineComment = findLineComment(line)
    if (lineComment !== null) {
      const text = stripLineMarker(line.slice(lineComment))
      if (text && !LICENSE_RE.test(text) && !BANNER_RE.test(trimmed)) {
        // Inline trailing comment (code then //) annotates THIS line, not the next.
        const codeBefore = line.slice(0, lineComment).trim()
        const next = codeBefore.length > 0 ? codeBefore : nextCodeLine(lines, i + 1)
        out.push({ text, line: i + 1, nextCode: next, block: false })
      }
    }
  }

  return out
}

/**
 * Return the index where a line comment ("//" or "#") begins, or null.
 * Naive string-awareness: ignores markers that appear inside single/double quotes.
 */
function findLineComment(line: string): number | null {
  let inS = false
  let inD = false
  let inT = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    const prev = line[i - 1]
    if (c === "'" && !inD && !inT && prev !== '\\') inS = !inS
    else if (c === '"' && !inS && !inT && prev !== '\\') inD = !inD
    else if (c === '`' && !inS && !inD && prev !== '\\') inT = !inT
    else if (!inS && !inD && !inT) {
      if (c === '/' && line[i + 1] === '/') return i
      if (c === '#') return i
    }
  }
  return null
}
