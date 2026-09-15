import { useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useFishingStore } from '../../stores/useFishingStore'

const TRIGGER_RADIUS = 1.5

export function FishingSpot({
  id,
  position,
  playerPositionRef,
}: {
  id: string
  position: [number, number, number]
  playerPositionRef: RefObject<THREE.Vector3>
}) {
  const wasNearRef = useRef(false)
  const spotPos = useRef(new THREE.Vector3(...position))

  useFrame(() => {
    const player = playerPositionRef.current
    if (!player) return
    const isNear = player.distanceTo(spotPos.current) < TRIGGER_RADIUS

    // ENTER/EXIT transition only — never write to the store every frame.
    if (isNear !== wasNearRef.current) {
      wasNearRef.current = isNear
      useFishingStore.getState().setNearSpot(isNear ? id : null)
    }
  })

  return (
    <mesh position={position}>
      <cylinderGeometry args={[0.4, 0.4, 0.1, 16]} />
      <meshStandardMaterial color="#f4c95d" />
    </mesh>
  )
}
