import { useMemo } from 'react'
// Redundant now that App.tsx imports @react-three/fiber, kept as a safety net if this file is ever used standalone
import type {} from '@react-three/fiber'
import { ISLAND_GRID, buildIslandGeometry } from '../../data/island'

export function Island() {
  const geometry = useMemo(() => buildIslandGeometry(ISLAND_GRID), [])

  return (
    <mesh geometry={geometry} userData={{ walkable: true }} receiveShadow castShadow>
      <meshStandardMaterial vertexColors roughness={0.9} />
    </mesh>
  )
}
