// Path patterns that warrant explicit risk / trade-off notes in PR descriptions.

const SENSITIVE_SEGMENTS =
  /(?:^|\/)(?:auth|authentication|security|crypto|migration|migrations|\.github\/workflows|secrets?|password|token|oauth|permissions?)(?:\/|$)/i

const TEST_FILE_RE =
  /(?:^|\/)(?:.*\.(?:test|spec)\.[a-z]+$|.*_test\.(?:go|rs)$|tests?\/|__tests__\/|test\/)/i

export function touchesSensitivePath(files: string[]): boolean {
  return files.some((f) => SENSITIVE_SEGMENTS.test(f))
}

export function hasTestFileChanges(files: string[]): boolean {
  return files.some((f) => TEST_FILE_RE.test(f))
}
