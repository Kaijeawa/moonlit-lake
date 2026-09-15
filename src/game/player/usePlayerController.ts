import { useRef, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const MOVE_SPEED = 4 // world units per second
// Ground-contact point on the island surface (y = 1). Tile (4, 4) is on
// the island (dist 5.66 ≤ 6). Not persisted — every load spawns here.
const DOCK_SPAWN = new THREE.Vector3(4, 1, 4)
const ARRIVE_EPSILON = 0.05

export function usePlayerController() {
  const positionRef = useRef(DOCK_SPAWN.clone())
  const targetRef = useRef<THREE.Vector3 | null>(null)
  const scratch = useRef(new THREE.Vector3())

  const setTarget = useCallback((point: THREE.Vector3) => {
    targetRef.current = point.clone()
  }, [])

  useFrame((_, delta) => {
    const target = targetRef.current
    if (!target) return

    const pos = positionRef.current
    const toTarget = scratch.current.subVectors(target, pos)
    const distance = toTarget.length()

    if (distance < ARRIVE_EPSILON) {
      pos.copy(target)
      targetRef.current = null
      return
    }

    const step = Math.min(MOVE_SPEED * delta, distance)
    pos.add(toTarget.normalize().multiplyScalar(step))
  })

  return { positionRef, setTarget }
}
