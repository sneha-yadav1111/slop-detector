import { describe, it, expect } from 'vitest'
import { DailyCapAdapter } from '../../../src/core/llm/cap.js'
import type { CachePort } from '../../../src/adapters/cache/port.js'

class StubCache implements CachePort {
  store = new Map<string, string>()
  countWithPrefixImpl: (prefix: string, max: number) => Promise<number> = async () => 0
  async get(key: string) {
    return this.store.get(key) ?? null
  }
  async set(key: string, value: string) {
    this.store.set(key, value)
  }
  async countWithPrefix(prefix: string, max: number) {
    return this.countWithPrefixImpl(prefix, max)
  }
}

describe('DailyCapAdapter (LLM-07 + D-11)', () => {
  it('returns false when countWithPrefix returns 0', async () => {
    const c = new StubCache()
    c.countWithPrefixImpl = async () => 0
    const cap = new DailyCapAdapter(c, 50)
    expect(await cap.isExceeded('owner/repo')).toBe(false)
  })

  it('returns false when count < maxPerDay (boundary: maxPerDay - 1)', async () => {
    const c = new StubCache()
    c.countWithPrefixImpl = async () => 49
    const cap = new DailyCapAdapter(c, 50)
    expect(await cap.isExceeded('owner/repo')).toBe(false)
  })

  it('returns true when count >= maxPerDay (boundary: count == maxPerDay)', async () => {
    const c = new StubCache()
    c.countWithPrefixImpl = async () => 50
    const cap = new DailyCapAdapter(c, 50)
    expect(await cap.isExceeded('owner/repo')).toBe(true)
  })

  it('recordCall writes sequential markers slop-detector-cap-{repoKey}-{YYYY-MM-DD}-marker-NNN', async () => {
    const c = new StubCache()
    let calls = 0
    c.countWithPrefixImpl = async () => calls++
    const cap = new DailyCapAdapter(c, 50)
    await cap.recordCall('owner/repo')
    await cap.recordCall('owner/repo')
    const keys = [...c.store.keys()]
    const date = new Date().toISOString().slice(0, 10)
    expect(keys).toContain(`slop-detector-cap-owner/repo-${date}-marker-000`)
    expect(keys).toContain(`slop-detector-cap-owner/repo-${date}-marker-001`)
  })

  it('two recordCall invocations on fresh stub produce markers -000 then -001', async () => {
    const c = new StubCache()
    let calls = 0
    c.countWithPrefixImpl = async () => calls++
    const cap = new DailyCapAdapter(c, 50)
    await cap.recordCall('o/r')
    await cap.recordCall('o/r')
    const keys = [...c.store.keys()].sort()
    expect(keys.length).toBe(2)
    expect(keys[0]).toMatch(/-marker-000$/)
    expect(keys[1]).toMatch(/-marker-001$/)
  })

  it('date key uses UTC ISO YYYY-MM-DD format', async () => {
    const c = new StubCache()
    let captured: string | undefined
    c.countWithPrefixImpl = async (prefix: string) => {
      captured = prefix
      return 0
    }
    const cap = new DailyCapAdapter(c, 50)
    await cap.isExceeded('owner/repo')
    const expected = new Date().toISOString().slice(0, 10)
    expect(captured).toBeDefined()
    expect(captured).toContain(expected)
    expect(captured).toContain('owner/repo')
  })

  it('uses default maxPerDay=50 when constructor argument omitted', async () => {
    const c = new StubCache()
    c.countWithPrefixImpl = async () => 49
    const cap = new DailyCapAdapter(c) // default = 50
    expect(await cap.isExceeded('r')).toBe(false)
    c.countWithPrefixImpl = async () => 50
    expect(await cap.isExceeded('r')).toBe(true)
  })

  it('constructor accepts both CachePort and maxPerDay arguments', () => {
    const c = new StubCache()
    const capWithDefault = new DailyCapAdapter(c)
    const capWithOverride = new DailyCapAdapter(c, 10)
    expect(capWithDefault).toBeInstanceOf(DailyCapAdapter)
    expect(capWithOverride).toBeInstanceOf(DailyCapAdapter)
  })
})
