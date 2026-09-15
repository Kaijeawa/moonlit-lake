import { useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh, Vector3 } from 'three'

// Capsule radius 0.3 + half-length 0.3 = 0.6: lifts the capsule so its
// feet sit on the ground-contact point instead of its center.
const CAPSULE_RADIUS = 0.3
const CAPSULE_LENGTH = 0.6
const FEET_OFFSET = CAPSULE_RADIUS + CAPSULE_LENGTH / 2

export function Player({ positionRef }: { positionRef: RefObject<Vector3> }) {
  const meshRef = useRef<Mesh>(null)

  useFrame(() => {
    const mesh = meshRef.current
    const pos = positionRef.current
    if (!mesh || !pos) return
    mesh.position.set(pos.x, pos.y + FEET_OFFSET, pos.z)
  })

  return (
    <mesh ref={meshRef} castShadow>
      <capsuleGeometry args={[CAPSULE_RADIUS, CAPSULE_LENGTH, 4, 8]} />
      <meshStandardMaterial color="#e0a458" />
    </mesh>
  )
}
