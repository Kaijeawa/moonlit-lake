import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

export type IslandTile = {
  x: number
  z: number
  height: number
  color: string
}

// Small hand-placed layout for M0: a roughly circular grass island.
// Extended with props/dock/fishing-spot tiles in later milestones.
const GRASS = '#4a7c3a'
const SAND = '#e3d29a'

// Distance from (px,pz) to the segment a->b, used to paint the sand path.
function distToSegment(px: number, pz: number, ax: number, az: number, bx: number, bz: number) {
  const abx = bx - ax
  const abz = bz - az
  const t = Math.max(0, Math.min(1, ((px - ax) * abx + (pz - az) * abz) / (abx * abx + abz * abz)))
  return Math.hypot(px - (ax + t * abx), pz - (az + t * abz))
}

export const ISLAND_GRID: IslandTile[] = (() => {
  const tiles: IslandTile[] = []
  const radius = 6
  for (let x = -radius; x <= radius; x++) {
    for (let z = -radius; z <= radius; z++) {
      const dist = Math.sqrt(x * x + z * z)
      if (dist <= radius) {
        // Sand path runs from the west shore through spawn to the dock.
        const onPath = distToSegment(x, z, -5, 0, 5, 3) <= 0.7
        tiles.push({ x, z, height: 1, color: onPath ? SAND : GRASS })
      }
    }
  }
  return tiles
})()

/**
 * Merges one box per tile into a single BufferGeometry with a per-vertex
 * color attribute, so the whole island renders as one draw call.
 */
export function buildIslandGeometry(grid: IslandTile[]): THREE.BufferGeometry {
  const geometries: THREE.BufferGeometry[] = grid.map((tile) => {
    const depth = tile.height + 1 // one extra layer below the waterline
    const box = new THREE.BoxGeometry(1, depth, 1)
    box.translate(tile.x, tile.height - depth / 2, tile.z)

    const color = new THREE.Color(tile.color)
    const vertexCount = box.getAttribute('position').count
    const colors = new Float32Array(vertexCount * 3)
    for (let i = 0; i < vertexCount; i++) {
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b
    }
    box.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return box
  })

  const merged = mergeGeometries(geometries, false)
  if (!merged) {
    throw new Error('Failed to merge island tile geometries — check for mismatched vertex attributes')
  }
  merged.computeVertexNormals()
  return merged
}
