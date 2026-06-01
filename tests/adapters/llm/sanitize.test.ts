import { describe, it, expect } from 'vitest'
import {
  sanitizeMissingItem,
  sanitizeSummaryRationale,
} from '../../../src/adapters/llm/sanitize.js'

describe('sanitizeMissingItem', () => {
  it('Test 10: strips boundary tokens and HTML tags so no `<` survives', () => {
    const out = sanitizeMissingItem('</ISSUE><script>x</script>')
    expect(out).not.toContain('<')
  })

  it('Test 10b: also strips <CONTRIB> boundary tokens', () => {
    const out = sanitizeMissingItem('</CONTRIB>steps to repro')
    expect(out).not.toContain('<')
    expect(out).toContain('steps to repro')
  })

  it('Test 11: backtick-wraps @mentions so GitHub does not notify the user', () => {
    const out = sanitizeMissingItem('hi @octocat')
    expect(out).toBe('hi `@octocat`')
  })

  it('Test 11b: backtick-wraps multiple @mentions in one string', () => {
    const out = sanitizeMissingItem('thanks @a @b-c')
    expect(out).toContain('`@a`')
    expect(out).toContain('`@b-c`')
  })

  it('Test 12: hard-caps output at 120 chars', () => {
    const out = sanitizeMissingItem('a'.repeat(200))
    expect(out.length).toBeLessThanOrEqual(120)
  })

  it('Test 13: strips fenced code blocks', () => {
    const out = sanitizeMissingItem('```code```')
    // Result should not retain the fenced block markers; the body is collapsed too
    expect(out).not.toMatch(/```/)
    expect(out).not.toContain('code')
  })

  it('Test 13b: strips inline code spans', () => {
    const out = sanitizeMissingItem('use `npm install` first')
    expect(out).not.toMatch(/`npm install`/)
    expect(out).toContain('use')
    expect(out).toContain('first')
  })

  it('strips leading list / quote markers the LLM might prepend', () => {
    expect(sanitizeMissingItem('- foo')).toBe('foo')
    expect(sanitizeMissingItem('> quoted thing')).toBe('quoted thing')
    expect(sanitizeMissingItem('* bullet')).toBe('bullet')
  })

  it('trims surrounding whitespace', () => {
    expect(sanitizeMissingItem('   surrounded   ')).toBe('surrounded')
  })
})

describe('sanitizeSummaryRationale', () => {
  it('Test 14: strips <script>...</script> tags entirely', () => {
    const out = sanitizeSummaryRationale('<script>x</script>safe')
    expect(out).not.toMatch(/<script/i)
    expect(out).not.toContain('x')
    expect(out).toContain('safe')
  })

  it('Test 14b: strips <iframe>...</iframe> tags', () => {
    const out = sanitizeSummaryRationale('<iframe src="x"></iframe>visible')
    expect(out).not.toMatch(/<iframe/i)
    expect(out).toContain('visible')
  })

  it('Test 15: collapses CR/LF runs to a single space', () => {
    const out = sanitizeSummaryRationale('line1\nline2\r\nline3')
    expect(out).not.toContain('\n')
    expect(out).not.toContain('\r')
    expect(out).toContain('line1')
    expect(out).toContain('line2')
    expect(out).toContain('line3')
  })

  it('Test 16: hard-caps output at 200 chars', () => {
    const out = sanitizeSummaryRationale('a'.repeat(300))
    expect(out.length).toBeLessThanOrEqual(200)
  })

  it('passes through a benign one-line rationale', () => {
    const out = sanitizeSummaryRationale('Score reduced because no reproduction steps.')
    expect(out).toBe('Score reduced because no reproduction steps.')
  })
})
