#!/usr/bin/env node
// Parse bench/pr-metrics.json (written by pr-benchmark.ts) and fail CI if below thresholds.

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const metricsPath = join(root, 'bench', 'pr-metrics.json')

function arg(name, fallback) {
  const i = process.argv.indexOf(name)
  if (i === -1 || !process.argv[i + 1]) return fallback
  return Number(process.argv[i + 1])
}

const minF1 = arg('--min-f1', 0.75)
const maxFpr = arg('--max-fpr', 0.22)

let metrics
try {
  metrics = JSON.parse(readFileSync(metricsPath, 'utf8'))
} catch {
  console.error(`Missing ${metricsPath} — run pnpm bench:pr first.`)
  process.exit(1)
}

const { f1, fpr, n } = metrics
let failed = false
if (f1 < minF1) {
  console.error(`F1 ${f1.toFixed(3)} < minimum ${minF1}`)
  failed = true
}
if (fpr > maxFpr) {
  console.error(`FPR ${fpr.toFixed(3)} > maximum ${maxFpr}`)
  failed = true
}
if (n < 80) {
  console.error(`Dataset N=${n} < 80 (expand bench/pr-fixtures/dataset.json)`)
  failed = true
}
if (failed) process.exit(1)
console.log(`PR benchmark OK: N=${n} F1=${f1.toFixed(3)} FPR=${fpr.toFixed(3)}`)
