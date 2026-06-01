// src/adapters/cache/runner-cache.ts
// LLM-07 + D-09 + D-11 + D-14: production CachePort using the @actions/cache toolkit.
// ACTIONS_CACHE_URL + ACTIONS_RUNTIME_TOKEN are auto-injected by the runner for JS Actions
// (no workflow YAML changes required from installers).
// Pitfall 2: cache entries are immutable per key; the daily-cap counter uses date-rolling
// sequential markers (cap.ts) — never a read-modify-write counter under one key.
// Pitfall 7: concurrent writers race for the same key; ReserveCacheError on the loser is
// the EXPECTED outcome (the cache is populated, which is what we wanted). Swallow it.

import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import * as cache from '@actions/cache'
import type { CachePort } from './port.js'

export class RunnerCachePort implements CachePort {
  private workDir: string

  constructor() {
    this.workDir = mkdtempSync(join(tmpdir(), 'slop-detector-cache-'))
  }

  async get(key: string): Promise<string | null> {
    const filePath = join(this.workDir, 'value.txt')
    try {
      const restored = await cache.restoreCache([filePath], key)
      if (!restored) return null
      return existsSync(filePath) ? readFileSync(filePath, 'utf-8') : null
    } catch {
      return null // silent fallthrough (hero-output invariant)
    }
  }

  async set(key: string, value: string): Promise<void> {
    const filePath = join(this.workDir, 'value.txt')
    writeFileSync(filePath, value, 'utf-8')
    try {
      await cache.saveCache([filePath], key)
    } catch (err: unknown) {
      const e = err as { name?: string; message?: string }
      if (
        e.name === 'ReserveCacheError' ||
        /already reserved|already exists/i.test(e.message ?? '')
      ) {
        return // benign — another run already populated this key
      }
      throw err
    }
  }

  async countWithPrefix(prefix: string, maxProbe: number): Promise<number> {
    let count = 0
    for (let i = 0; i < maxProbe; i++) {
      const probeKey = `${prefix}-marker-${String(i).padStart(3, '0')}`
      const filePath = join(this.workDir, `probe-${i}.txt`)
      try {
        const hit = await cache.restoreCache([filePath], probeKey)
        if (hit) count++
        else break // sequential markers — first miss bounds the count
      } catch {
        break // probe loop is unreliable; abort with current count
      }
    }
    return count
  }
}
