import { describe, it, expect } from 'vitest'
import { FISH, getAvailableFish, getFishById, rollWeight } from './fish'

describe('FISH data integrity', () => {
  it('has unique ids', () => {
    const ids = FISH.map((f) => f.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('has a valid weight range on every fish', () => {
    for (const f of FISH) {
      expect(f.weightRange[0]).toBeGreaterThan(0)
      expect(f.weightRange[1]).toBeGreaterThanOrEqual(f.weightRange[0])
    }
  })
})

describe('getFishById', () => {
  it('finds a fish by id', () => {
    expect(getFishById('carp')?.name).toBe('Carp')
  })

  it('returns undefined for an unknown id', () => {
    expect(getFishById('nope')).toBeUndefined()
  })
})

describe('getAvailableFish', () => {
  it('returns only fish matching spot and time-of-day', () => {
    const result = getAvailableFish('dock', 'day', 1)
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((f) => f.spotId === 'dock' && f.timeOfDay === 'day')).toBe(true)
  })

  it('returns nothing at night when no night fish exist yet (M1 data)', () => {
    expect(getAvailableFish('dock', 'night', 99)).toEqual([])
  })

  it('excludes fish requiring a higher rod tier than provided', () => {
    const highTierFish = FISH.find((f) => f.minRod > 1)
    expect(highTierFish).toBeDefined()
    const result = getAvailableFish(highTierFish!.spotId, highTierFish!.timeOfDay, 1)
    expect(result.find((f) => f.id === highTierFish!.id)).toBeUndefined()
  })

  it('includes a fish once rodTier meets its minRod', () => {
    const highTierFish = FISH.find((f) => f.minRod > 1)!
    const result = getAvailableFish(highTierFish.spotId, highTierFish.timeOfDay, highTierFish.minRod)
    expect(result.find((f) => f.id === highTierFish.id)).toBeDefined()
  })

  it('returns empty array for an unknown spot', () => {
    expect(getAvailableFish('nonexistent-spot', 'day', 99)).toEqual([])
  })
})

describe('rollWeight', () => {
  it('returns the minimum when random yields 0', () => {
    const fish = FISH[0]
    expect(rollWeight(fish, () => 0)).toBe(fish.weightRange[0])
  })

  it('returns the maximum when random yields just under 1', () => {
    const fish = FISH[0]
    expect(rollWeight(fish, () => 0.999999)).toBeCloseTo(fish.weightRange[1], 1)
  })

  it('always stays within the fish weight range', () => {
    const fish = FISH[0]
    for (let i = 0; i < 100; i++) {
      const w = rollWeight(fish)
      expect(w).toBeGreaterThanOrEqual(fish.weightRange[0])
      expect(w).toBeLessThanOrEqual(fish.weightRange[1])
    }
  })
})
