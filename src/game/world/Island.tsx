import { useMemo } from 'react'
import * as THREE from 'three'
import { ISLAND_GRID, buildIslandGeometry } from '../../data/island'

export function Island() {
  const geometry = useMemo(() => buildIslandGeometry(ISLAND_GRID), [])

  return (
    <mesh geometry={geometry} userData={{ walkable: true }} receiveShadow>
      <meshStandardMaterial vertexColors roughness={0.9} />
    </mesh>
  )
}
