// src/core/llm/cap.ts
// LLM-07 + D-11: shared 50/24h daily-cap counter (gray-zone adjudication + Tier-3 extraction
// draw from the same bucket — see CONTEXT D-11).
// CRITICAL: This file MUST NOT import from @octokit, @actions, fs, https, or any LLM SDK.
// The CachePort injection is satisfied by an adapter in Plan 04-05.

import type { CachePort } from '../../adapters/cache/port.js'

export interface CapPort {
  isExceeded(repoKey: string): Promise<boolean>
  recordCall(repoKey: string): Promise<void>
}

export class DailyCapAdapter implements CapPort {
  constructor(
    private cache: CachePort,
    private maxPerDay = 50,
  ) {}

  private dateKey(): string {
    return new Date().toISOString().slice(0, 10) // 'YYYY-MM-DD' UTC
  }

  private prefix(repoKey: string): string {
    return `slop-detector-cap-${repoKey}-${this.dateKey()}`
  }

  async isExceeded(repoKey: string): Promise<boolean> {
    const count = await this.cache.countWithPrefix(this.prefix(repoKey), this.maxPerDay + 1)
    return count >= this.maxPerDay
  }

  async recordCall(repoKey: string): Promise<void> {
    const count = await this.cache.countWithPrefix(this.prefix(repoKey), this.maxPerDay + 1)
    const marker = String(count).padStart(3, '0')
    await this.cache.set(`${this.prefix(repoKey)}-marker-${marker}`, '1')
  }
}
