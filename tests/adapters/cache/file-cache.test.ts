import { mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { FileCachePort } from '../../../src/adapters/cache/file-cache.js'

let dir: string
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'fc-'))
})
afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe('FileCachePort', () => {
  it('Test 1: returns null on miss', async () => {
    expect(await new FileCachePort(dir).get('k')).toBeNull()
  })

  it('Test 2: set then get round-trip', async () => {
    const c = new FileCachePort(dir)
    await c.set('k', 'v')
    expect(await c.get('k')).toBe('v')
  })

  it('Test 3: set overwrites', async () => {
    const c = new FileCachePort(dir)
    await c.set('k', 'v1')
    await c.set('k', 'v2')
    expect(await c.get('k')).toBe('v2')
  })

  it('Test 4: creates baseDir if missing', async () => {
    const nested = join(dir, 'nested', 'cache')
    new FileCachePort(nested) // constructor should mkdir -p
    expect(readdirSync(nested)).toEqual([])
  })

  it('Test 5: returns null when value file disappears between calls', async () => {
    const c = new FileCachePort(dir)
    await c.set('k', 'v')
    // Manually remove the cache directory contents
    rmSync(dir, { recursive: true, force: true })
    expect(await c.get('k')).toBeNull()
  })

  it('Test 6: countWithPrefix returns matching count', async () => {
    const c = new FileCachePort(dir)
    await c.set('pfx-marker-000', '1')
    await c.set('pfx-marker-001', '1')
    await c.set('pfx-marker-002', '1')
    await c.set('other-key', 'x')
    expect(await c.countWithPrefix('pfx-marker', 50)).toBe(3)
  })

  it('Test 7: countWithPrefix honors maxProbe ceiling', async () => {
    const c = new FileCachePort(dir)
    for (let i = 0; i < 10; i++) {
      await c.set(`pfx-${String(i).padStart(3, '0')}`, 'v')
    }
    expect(await c.countWithPrefix('pfx', 5)).toBe(5)
  })

  it('Test 8: countWithPrefix returns 0 for empty dir', async () => {
    expect(await new FileCachePort(dir).countWithPrefix('pfx', 50)).toBe(0)
  })

  it('Test 9: handles special characters in key (no /, no # in filenames)', async () => {
    const c = new FileCachePort(dir)
    await c.set('owner/repo#42', 'v')
    expect(await c.get('owner/repo#42')).toBe('v')
    const files = readdirSync(dir)
    expect(files.length).toBe(1)
    expect(files.every((f) => !/[/#]/.test(f))).toBe(true)
  })
})
