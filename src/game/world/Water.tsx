// src/game/world/Water.tsx
import { MeshReflectorMaterial } from '@react-three/drei'
// Redundant now that App.tsx imports @react-three/fiber, kept as a safety net if this file is ever used standalone
import type {} from '@react-three/fiber'

export function Water() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]}>
      <planeGeometry args={[60, 60]} />
      <MeshReflectorMaterial
        mirror={0.4}
        blur={[300, 100]}
        resolution={1024}
        mixBlur={1}
        mixStrength={40}
        roughness={0.7}
        depthScale={1}
        minDepthThreshold={0.85}
        color="#3a6ea5"
        metalness={0.4}
      />
    </mesh>
  )
}
