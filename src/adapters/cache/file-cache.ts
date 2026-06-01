// src/adapters/cache/file-cache.ts
// LLM-07 + RESEARCH §706-710: local-filesystem CachePort for the bench harness.
// First bench --with-llm run pays full LLM cost; bench/.cache/llm/ is committed to git
// so subsequent runs and judge reproductions are free.
// Same silent-fallthrough contract as RunnerCachePort.

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { CachePort } from './port.js'

// Transform a cache key into a filesystem-safe filename. Keep the prefix structure intact
// so countWithPrefix can use readdirSync + filter.
function keyToFilename(key: string): string {
  return `${key.replace(/[^a-zA-Z0-9._-]/g, '_')}.json`
}

export class FileCachePort implements CachePort {
  private baseDir: string

  constructor(baseDir: string) {
    this.baseDir = baseDir
    if (!existsSync(baseDir)) mkdirSync(baseDir, { recursive: true })
  }

  async get(key: string): Promise<string | null> {
    const path = join(this.baseDir, keyToFilename(key))
    if (!existsSync(path)) return null
    try {
      return readFileSync(path, 'utf-8')
    } catch {
      return null
    }
  }

  async set(key: string, value: string): Promise<void> {
    const path = join(this.baseDir, keyToFilename(key))
    try {
      writeFileSync(path, value, 'utf-8')
    } catch {
      // silent — bench harness should not crash on cache-write failure
    }
  }

  async countWithPrefix(prefix: string, maxProbe: number): Promise<number> {
    let entries: string[]
    try {
      entries = readdirSync(this.baseDir)
    } catch {
      return 0
    }
    const filenamePrefix = keyToFilename(prefix).replace(/\.json$/, '')
    const matches = entries.filter((e) => e.startsWith(filenamePrefix))
    return Math.min(matches.length, maxProbe)
  }
}
