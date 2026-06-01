// src/adapters/cache/port.ts
// LLM-07 + D-09 + D-11 + D-14: CachePort is the abstraction the adjudicator depends on.
// Concrete adapters in src/adapters/cache/ (RunnerCachePort, FileCachePort) implement this
// against @actions/cache (Plan 04-05) and the local filesystem (Plan 04-05 bench path).

export interface CachePort {
  /** Returns the cached value or null on miss. NEVER throws. */
  get(key: string): Promise<string | null>
  /** Stores value at key. On ReserveCacheError (concurrent writer won) returns silently. NEVER throws on benign duplicate. */
  set(key: string, value: string): Promise<void>
  /**
   * Counts sequential markers under `<prefix>-marker-NNN` (NNN starting from 000).
   * Stops at first miss OR when count reaches maxProbe. Used for the daily-cap counter
   * (Pitfall 2: @actions/cache entries are immutable per key; we use date-rolling sequential markers).
   */
  countWithPrefix(prefix: string, maxProbe: number): Promise<number>
}
