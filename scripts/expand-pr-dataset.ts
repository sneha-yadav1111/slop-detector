#!/usr/bin/env tsx
// Expand bench/pr-fixtures/dataset.json to N≥80 with templated PR/commit/comment cases.

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const path = join(root, 'bench', 'pr-fixtures', 'dataset.json')

type Item = {
  id: string
  kind: 'pr' | 'commit' | 'comments'
  isSlop: boolean
  note?: string
  pr?: Record<string, unknown>
  source?: string
}

const base = JSON.parse(readFileSync(path, 'utf8')) as {
  _meta: Record<string, unknown>
  items: Item[]
}

const handLabeled = base.items.filter((i) => !i.id.startsWith('gen-'))
const existing = new Set(handLabeled.map((i) => i.id))
const extra: Item[] = []

function add(item: Item) {
  if (existing.has(item.id)) return
  existing.add(item.id)
  extra.push(item)
}

const slopBodies = [
  'This PR introduces the following changes:\n\n- Updated `userService.ts`\n- Modified `authController.ts`\n\nThese changes improve the codebase and enhance maintainability.',
  '## Summary of changes\n\nThis change adds new functionality to the application. The following files were modified to implement the feature. Key changes include updates to the relevant modules.',
  'Various fixes and improvements across the codebase.',
  'Refactored the code in the changed files.',
]

const goodBodies = [
  '## Why\nFixes a race when two tabs refresh tokens concurrently (fixes #482).\n\n## Testing\nUnit test with 10 parallel callers; manual staging check.\n\n## Risk\nLow; per-session lock only. Follow-up: multi-tab coordination.',
  'Profiling showed YAML parsing at 40% of p95. Memoize by content hash; trade-off is small unbounded cache per repo. Verified with existing template tests plus cache-hit assertion. Refs #901.',
  'Fixes #1203: null `issue.body` crashed the scorer. Root cause: unguarded `.length`. Added null-coalesce + regression test reproducing the webhook payload.',
]

for (let i = 0; i < 35; i++) {
  add({
    id: `gen-slop-pr-${i}`,
    kind: 'pr',
    isSlop: true,
    note: 'Generated slop template',
    pr: {
      title: `Update batch ${i}`,
      body: slopBodies[i % slopBodies.length],
      changedFiles: [`src/a${i}.ts`, `src/b${i}.ts`],
      changedFileCount: 2,
      linesChanged: 80 + i,
      commits: ['update', 'fix', 'wip'],
    },
  })
}

for (let i = 0; i < 25; i++) {
  add({
    id: `gen-good-pr-${i}`,
    kind: 'pr',
    isSlop: false,
    note: 'Generated genuine template',
    pr: {
      title: `Meaningful change ${i} (#${1000 + i})`,
      body: goodBodies[i % goodBodies.length],
      changedFiles: [`src/feature${i}.ts`, `tests/feature${i}.test.ts`],
      changedFileCount: 2,
      linesChanged: 40 + i,
      commits: [`Describe change ${i} with context`],
      hasTestFileChanges: true,
    },
  })
}

for (let i = 0; i < 8; i++) {
  add({
    id: `gen-comments-slop-${i}`,
    kind: 'comments',
    isSlop: true,
    note: 'Generated restating comments',
    source: `function f${i}() {\n  // increment\n  x++;\n  // return x\n  return x;\n}`,
  })
}

for (let i = 0; i < 6; i++) {
  add({
    id: `gen-comments-good-${i}`,
    kind: 'comments',
    isSlop: false,
    note: 'Generated why-comments',
    source: `// Workaround for #${i}: upstream API returns 409 on retry\nfunction g${i}() { return 1; }`,
  })
}

base._meta = {
  ...base._meta,
  description:
    'Curated + programmatic expansion (honest disclosure). Original hand-labeled cases plus generated templates for scale.',
  humanLabeledCount: 13,
  generatedCount: extra.length,
}
base.items = [...handLabeled, ...extra]

writeFileSync(path, `${JSON.stringify(base, null, 2)}\n`, 'utf8')
console.log(`Expanded dataset: ${base.items.length} items (+${extra.length} new)`)
