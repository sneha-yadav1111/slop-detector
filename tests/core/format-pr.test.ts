import { describe, expect, it } from 'vitest'
import { MARKER } from '../../src/core/format/markdown.js'
import { formatPr } from '../../src/core/format/pr-markdown.js'
import { scorePr } from '../../src/core/pr/score.js'

describe('formatPr', () => {
  it('includes marker and score', () => {
    const scored = scorePr({
      title: 'Update',
      body: 'update files',
      changedFiles: ['a.ts'],
      changedFileCount: 1,
      linesChanged: 50,
    })
    const md = formatPr(scored, 'Update')
    expect(md).toContain(MARKER)
    expect(md).toContain('Information-density score')
    expect(md).toContain('Suggested additions')
  })
})
