import { describe, it, expect } from 'vitest'
import { scoreCast, type Zones } from './scoring'

const zones: Zones = { greenStart: 30, greenEnd: 70, perfectStart: 45, perfectEnd: 55 }

describe('scoreCast', () => {
  it('returns perfect when pointer is inside the perfect zone', () => {
    expect(scoreCast(50, zones)).toBe('perfect')
  })

  it('returns good when pointer is inside the green zone but outside perfect', () => {
    expect(scoreCast(35, zones)).toBe('good')
    expect(scoreCast(65, zones)).toBe('good')
  })

  it('returns miss when pointer is outside the green zone entirely', () => {
    expect(scoreCast(10, zones)).toBe('miss')
    expect(scoreCast(90, zones)).toBe('miss')
  })

  it('treats zone boundaries as inclusive', () => {
    expect(scoreCast(30, zones)).toBe('good')
    expect(scoreCast(70, zones)).toBe('good')
    expect(scoreCast(45, zones)).toBe('perfect')
    expect(scoreCast(55, zones)).toBe('perfect')
  })
})
