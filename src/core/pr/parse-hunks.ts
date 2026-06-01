// Pure patch → identifier tokens for diff-restatement detection (no I/O).

const MAX_TOKENS = 200

const PATTERNS: RegExp[] = [
  /\bfunction\s+([A-Za-z_$][\w$]*)/g,
  /\bclass\s+([A-Za-z_$][\w$]*)/g,
  /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/g,
  /\+\s*\/\/\s*(.{4,80})/g,
  /error[:\s]+["']([^"']{4,60})["']/gi,
  /["']([A-Za-z][\w$]{3,40})["']/g,
]

/** Extract semantic tokens from unified diff patches (capped). */
export function extractHunkTokens(patches: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []

  for (const patch of patches) {
    if (!patch) continue
    for (const re of PATTERNS) {
      re.lastIndex = 0
      let m: RegExpExecArray | null
      while ((m = re.exec(patch)) !== null) {
        const tok = (m[1] ?? m[0]).toLowerCase().trim()
        if (tok.length < 3 || tok.length > 80) continue
        if (seen.has(tok)) continue
        seen.add(tok)
        out.push(tok)
        if (out.length >= MAX_TOKENS) return out
      }
    }
  }
  return out
}
