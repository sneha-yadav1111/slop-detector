import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockRestoreCache, mockSaveCache } = vi.hoisted(() => ({
  mockRestoreCache: vi.fn(),
  mockSaveCache: vi.fn(),
}))

vi.mock('@actions/cache', () => ({
  restoreCache: mockRestoreCache,
  saveCache: mockSaveCache,
}))

import { RunnerCachePort } from '../../../src/adapters/cache/runner-cache.js'

beforeEach(() => {
  mockRestoreCache.mockReset()
  mockSaveCache.mockReset()
})

describe('RunnerCachePort.get', () => {
  it('Test 1: returns file contents on hit', async () => {
    const cache = new RunnerCachePort()
    mockSaveCache.mockResolvedValue(undefined)
    await cache.set('k1', 'v1') // writes value.txt under workDir
    mockRestoreCache.mockResolvedValue('k1') // truthy → restored
    expect(await cache.get('k1')).toBe('v1')
  })

  it('Test 2: returns null on miss', async () => {
    mockRestoreCache.mockResolvedValue(undefined)
    expect(await new RunnerCachePort().get('k')).toBeNull()
  })

  it('Test 3: returns null when restoreCache throws', async () => {
    mockRestoreCache.mockRejectedValue(new Error('runner not in actions'))
    expect(await new RunnerCachePort().get('k')).toBeNull()
  })
})

describe('RunnerCachePort.set', () => {
  it('Test 4: resolves on happy path and calls saveCache with [filePath]+key', async () => {
    mockSaveCache.mockResolvedValue(undefined)
    const c = new RunnerCachePort()
    await expect(c.set('k', 'v')).resolves.toBeUndefined()
    expect(mockSaveCache).toHaveBeenCalledTimes(1)
    const args = mockSaveCache.mock.calls[0]
    expect(args?.[1]).toBe('k')
    expect(Array.isArray(args?.[0])).toBe(true)
  })

  it('Test 5: swallows ReserveCacheError (Pitfall 7)', async () => {
    mockSaveCache.mockRejectedValue(
      Object.assign(new Error('already reserved'), { name: 'ReserveCacheError' }),
    )
    await expect(new RunnerCachePort().set('k', 'v')).resolves.toBeUndefined()
  })

  it('Test 5b: swallows /already exists/i message even without typed name', async () => {
    mockSaveCache.mockRejectedValue(new Error('Key already exists in cache'))
    await expect(new RunnerCachePort().set('k', 'v')).resolves.toBeUndefined()
  })

  it('Test 6: propagates other errors', async () => {
    mockSaveCache.mockRejectedValue(new Error('quota exceeded'))
    await expect(new RunnerCachePort().set('k', 'v')).rejects.toThrow('quota exceeded')
  })
})

describe('RunnerCachePort.countWithPrefix', () => {
  it('Test 7: returns 0 when first probe misses (stops at first miss)', async () => {
    mockRestoreCache.mockResolvedValue(undefined)
    expect(await new RunnerCachePort().countWithPrefix('pfx', 50)).toBe(0)
    expect(mockRestoreCache).toHaveBeenCalledTimes(1)
  })

  it('Test 8: returns 3 when probes 0..2 hit, 3 misses', async () => {
    mockRestoreCache
      .mockResolvedValueOnce('pfx-marker-000')
      .mockResolvedValueOnce('pfx-marker-001')
      .mockResolvedValueOnce('pfx-marker-002')
      .mockResolvedValueOnce(undefined)
    expect(await new RunnerCachePort().countWithPrefix('pfx', 50)).toBe(3)
    expect(mockRestoreCache).toHaveBeenCalledTimes(4)
  })

  it('Test 9: honors maxProbe ceiling', async () => {
    mockRestoreCache.mockImplementation(async (_paths: unknown, key: unknown) => key as string)
    expect(await new RunnerCachePort().countWithPrefix('pfx', 5)).toBe(5)
    expect(mockRestoreCache).toHaveBeenCalledTimes(5)
  })

  it('Test 10: breaks on probe error and returns count so far', async () => {
    mockRestoreCache
      .mockResolvedValueOnce('hit')
      .mockRejectedValueOnce(new Error('rate limited'))
    expect(await new RunnerCachePort().countWithPrefix('pfx', 50)).toBe(1)
  })

  it('Test 11: probe key shape is "${prefix}-marker-NNN" (padStart(3,"0"))', async () => {
    mockRestoreCache
      .mockResolvedValueOnce('hit')
      .mockResolvedValueOnce(undefined)
    await new RunnerCachePort().countWithPrefix('pfx', 50)
    expect(mockRestoreCache.mock.calls[0]?.[1]).toBe('pfx-marker-000')
    expect(mockRestoreCache.mock.calls[1]?.[1]).toBe('pfx-marker-001')
  })
})
