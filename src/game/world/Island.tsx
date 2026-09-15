import { useMemo } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { ISLAND_GRID, buildIslandGeometry } from '../../data/island'

export function Island({ onClick }: { onClick?: (event: ThreeEvent<MouseEvent>) => void }) {
  const geometry = useMemo(() => buildIslandGeometry(ISLAND_GRID), [])

  return (
    <mesh
      geometry={geometry}
      userData={{ walkable: true }}
      receiveShadow
      castShadow
      onClick={onClick}
    >
      <meshStandardMaterial vertexColors roughness={0.9} />
    </mesh>
  )
}
