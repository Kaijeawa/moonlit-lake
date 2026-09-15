import { describe, it, expect, afterEach } from 'vitest'
import { resolveCatch } from './resolveCatch'
import { useInventoryStore } from '../../stores/useInventoryStore'
import { FISH } from '../../data/fish'

const NOW = 1_700_000_000_000

describe('resolveCatch', () => {
  afterEach(() => {
    useInventoryStore.getState().reset()
  })

  it('stores a catch record referencing the fish by id, not the Fish object', () => {
    const record = resolveCatch(FISH[0], 2.3, () => NOW)
    expect(record).toEqual({ fishId: FISH[0].id, weight: 2.3, caughtAt: NOW })
    expect(useInventoryStore.getState().catches).toEqual([record])
  })

  it('accumulates across multiple calls', () => {
    resolveCatch(FISH[0], 1.5, () => NOW)
    resolveCatch(FISH[1], 0.9, () => NOW + 1)
    const catches = useInventoryStore.getState().catches
    expect(catches).toHaveLength(2)
    expect(catches.map((c) => c.fishId)).toEqual([FISH[0].id, FISH[1].id])
  })

  it('defaults caughtAt to the current time', () => {
    const before = Date.now()
    const record = resolveCatch(FISH[0], 1.0)
    expect(record.caughtAt).toBeGreaterThanOrEqual(before)
    expect(record.caughtAt).toBeLessThanOrEqual(Date.now())
  })
})
