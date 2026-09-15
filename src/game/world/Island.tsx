import { useMemo } from 'react'
import type {} from '@react-three/fiber'
import { ISLAND_GRID, buildIslandGeometry } from '../../data/island'

export function Island() {
  const geometry = useMemo(() => buildIslandGeometry(ISLAND_GRID), [])

  return (
    <mesh geometry={geometry} userData={{ walkable: true }} receiveShadow>
      <meshStandardMaterial vertexColors roughness={0.9} />
    </mesh>
  )
}
