// src/game/world/Water.tsx
import { MeshReflectorMaterial } from '@react-three/drei'
// Type-only import so `<mesh>`/`<planeGeometry>` JSX intrinsics type-check
// even if this file is compiled before anything else in the program has
// imported @react-three/fiber (see Task 3's fix for why this is needed).
import type {} from '@react-three/fiber'

export function Water() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]}>
      <planeGeometry args={[60, 60]} />
      <MeshReflectorMaterial
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
