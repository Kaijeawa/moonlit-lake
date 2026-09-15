import { PerspectiveCamera } from '@react-three/drei'

// Fixed perspective camera at a locked ~50deg elevation, matching the
// reference screenshot's foreshortening (spec Section 5). No user
// rotation or zoom in v1 (spec Section 3).
const CAMERA_DISTANCE = 14
const CAMERA_ELEVATION_DEG = 50

export function IsoCamera() {
  const rad = (CAMERA_ELEVATION_DEG * Math.PI) / 180
  const y = Math.sin(rad) * CAMERA_DISTANCE
  const horizontal = Math.cos(rad) * CAMERA_DISTANCE

  return (
    <PerspectiveCamera
      makeDefault
      position={[horizontal, y, horizontal]}
      fov={40}
      near={0.1}
      far={200}
      onUpdate={(camera) => camera.lookAt(0, 0, 0)}
    />
  )
}
