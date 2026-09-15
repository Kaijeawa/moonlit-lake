import { useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'

// Fixed perspective camera at a locked ~50deg elevation, matching the
// reference screenshot's foreshortening (spec Section 5). No user
// rotation or zoom in v1 (spec Section 3). Follows the player with a
// short lerp so the view eases instead of snapping.
const CAMERA_DISTANCE = 14
const CAMERA_ELEVATION_DEG = 50
const FOLLOW_LERP = 0.12

const rad = (CAMERA_ELEVATION_DEG * Math.PI) / 180
const OFFSET_Y = Math.sin(rad) * CAMERA_DISTANCE
// Split across X and Z so the combined horizontal radius is cos(rad)*D.
const OFFSET_XZ = (Math.cos(rad) * CAMERA_DISTANCE) / Math.SQRT2

export function IsoCamera({ targetRef }: { targetRef: RefObject<THREE.Vector3> }) {
  const camRef = useRef<THREE.PerspectiveCamera>(null)
  const smoothTarget = useRef<THREE.Vector3 | null>(null)

  useFrame(() => {
    const cam = camRef.current
    const target = targetRef.current
    if (!cam || !target) return

    if (!smoothTarget.current) {
      smoothTarget.current = target.clone()
    }
    const smooth = smoothTarget.current
    smooth.lerp(target, FOLLOW_LERP)

    cam.position.set(smooth.x + OFFSET_XZ, smooth.y + OFFSET_Y, smooth.z + OFFSET_XZ)
    cam.lookAt(smooth)
  })

  return <PerspectiveCamera ref={camRef} makeDefault fov={40} near={0.1} far={200} />
}
