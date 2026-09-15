import { describe, it, expect, afterEach } from 'vitest'
import { useInventoryStore, type CaughtFish } from './useInventoryStore'

const record: CaughtFish = { fishId: 'carp', weight: 2.3, caughtAt: 1_700_000_000_000 }

describe('useInventoryStore', () => {
  afterEach(() => {
    useInventoryStore.getState().reset()
  })

  it('starts with zero coins and no catches', () => {
    expect(useInventoryStore.getState().coins).toBe(0)
    expect(useInventoryStore.getState().catches).toEqual([])
  })

  it('addCatch appends without mutating the previous array', () => {
    const before = useInventoryStore.getState().catches
    useInventoryStore.getState().addCatch(record)
    const after = useInventoryStore.getState().catches
    expect(after).toHaveLength(1)
    expect(after[0]).toEqual(record)
    expect(before).toHaveLength(0)
    expect(after).not.toBe(before)
  })

  it('reset clears catches back to empty', () => {
    useInventoryStore.getState().addCatch(record)
    useInventoryStore.getState().reset()
    expect(useInventoryStore.getState().catches).toEqual([])
  })
})
