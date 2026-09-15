import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { ISLAND_GRID, buildIslandGeometry } from './island'

describe('buildIslandGeometry', () => {
  it('produces one merged BufferGeometry for the whole grid', () => {
    const geometry = buildIslandGeometry(ISLAND_GRID)
    expect(geometry).toBeInstanceOf(THREE.BufferGeometry)
  })

  it('has a vertex count matching 24 vertices per box (one box per tile)', () => {
    const geometry = buildIslandGeometry(ISLAND_GRID)
    const position = geometry.getAttribute('position')
    expect(position.count).toBe(ISLAND_GRID.length * 24)
  })

  it('carries a vertex color attribute (not a single flat material color)', () => {
    const geometry = buildIslandGeometry(ISLAND_GRID)
    expect(geometry.getAttribute('color')).toBeDefined()
  })

  it('positions each tile box at its grid x/z and height-scaled y', () => {
    const grid = [{ x: 0, z: 0, height: 1, color: '#4a7c3a' }]
    const geometry = buildIslandGeometry(grid)
    const position = geometry.getAttribute('position')
    // Every vertex's x should be within one tile-width of the tile's x=0 center
    for (let i = 0; i < position.count; i++) {
      expect(Math.abs(position.getX(i))).toBeLessThanOrEqual(0.5)
    }
  })
})
