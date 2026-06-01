import { describe, expect, it } from 'vitest'
import { extractComments } from '../../src/core/comments/extractor.js'
import { assessComment, scanComments } from '../../src/core/comments/detector.js'

describe('Code-comment slop detection (Track A)', () => {
  describe('extraction', () => {
    it('extracts // line comments and pairs them with the next code line', () => {
      const src = ['// increment the counter', 'counter++;'].join('\n')
      const [c] = extractComments(src)
      expect(c?.text).toBe('increment the counter')
      expect(c?.nextCode).toBe('counter++;')
    })

    it('extracts inline trailing comments as annotating their own line', () => {
      const src = 'total = a + b; // add a and b'
      const [c] = extractComments(src)
      expect(c?.text).toBe('add a and b')
      expect(c?.nextCode).toBe('total = a + b;')
    })

    it('extracts # comments (Python/shell)', () => {
      const src = ['# loop over items', 'for item in items:'].join('\n')
      const [c] = extractComments(src)
      expect(c?.text).toBe('loop over items')
    })

    it('extracts block comments and docstrings', () => {
      const src = ['/* This method handles the request */', 'function handle() {}'].join('\n')
      const [c] = extractComments(src)
      expect(c?.block).toBe(true)
      expect(c?.text.toLowerCase()).toContain('handles the request')
    })

    it('ignores license headers and banner lines', () => {
      const src = [
        '// Copyright 2026 Acme Corp. All rights reserved.',
        '// ============================',
        'const x = 1;',
      ].join('\n')
      expect(extractComments(src)).toHaveLength(0)
    })

    it('does not treat // inside a string as a comment', () => {
      const src = 'const url = "https://example.com";'
      expect(extractComments(src)).toHaveLength(0)
    })
  })

  describe('hollow-comment classification', () => {
    it('flags a comment that restates the next line (tautology)', () => {
      const v = assessComment({
        text: 'increment i by one',
        line: 1,
        nextCode: 'i++;',
        block: false,
      })
      expect(v.isSlop).toBe(true)
      expect(v.reasons).toContain('tautology')
    })

    it('flags AI boilerplate openers with no specifics', () => {
      const v = assessComment({
        text: 'This function handles the data and returns the result',
        line: 1,
        nextCode: 'function process(data) {',
        block: true,
      })
      expect(v.isSlop).toBe(true)
      expect(v.reasons).toContain('ai-boilerplate')
    })

    it('flags structural label comments that state the obvious', () => {
      const v = assessComment({ text: 'constructor', line: 1, nextCode: 'constructor() {', block: false })
      expect(v.isSlop).toBe(true)
      expect(v.reasons).toContain('states-obvious')
    })

    it('flags bare TODO markers with no description', () => {
      const v = assessComment({ text: 'TODO', line: 1, nextCode: null, block: false })
      expect(v.isSlop).toBe(true)
      expect(v.reasons).toContain('empty-or-marker')
    })

    it('does NOT flag comments that explain WHY (intent)', () => {
      const v = assessComment({
        text: 'serialize refreshes because two concurrent calls log the user out',
        line: 1,
        nextCode: 'await lock();',
        block: false,
      })
      expect(v.isSlop).toBe(false)
    })

    it('does NOT flag comments referencing an issue or edge case', () => {
      const a = assessComment({ text: 'workaround for #482, remove after upstream fix', line: 1, nextCode: 'retry();', block: false })
      const b = assessComment({ text: 'off-by-one: ranges are inclusive here', line: 1, nextCode: 'end = start + n;', block: false })
      expect(a.isSlop).toBe(false)
      expect(b.isSlop).toBe(false)
    })

    it('does NOT flag a comment that adds a concrete constraint the code lacks', () => {
      const v = assessComment({
        text: 'timeout must stay under the 30s gateway limit',
        line: 1,
        nextCode: 'const t = 25000;',
        block: false,
      })
      expect(v.isSlop).toBe(false)
    })
  })

  describe('aggregate scan', () => {
    it('computes a slop ratio over a source blob', () => {
      const src = [
        '// increment the index',
        'index++;',
        '',
        '// retry up to 3 times because the upstream API is flaky under load',
        'for (let attempt = 0; attempt < 3; attempt++) {',
        '  doRequest();',
        '}',
        '',
        '// loop',
        'for (const x of xs) {}',
      ].join('\n')
      const r = scanComments(src)
      expect(r.total).toBe(3)
      expect(r.slopCount).toBe(2) // "increment the index" + "loop"; the retry comment is real
      expect(r.slopRatio).toBeCloseTo(2 / 3, 2)
    })

    it('returns zero ratio for source with no comments', () => {
      const r = scanComments('const x = 1;\nreturn x;')
      expect(r.total).toBe(0)
      expect(r.slopRatio).toBe(0)
    })
  })
})
