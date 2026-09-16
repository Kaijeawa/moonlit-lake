// src/game/world/props/Lantern.tsx
// Emissive box only — a pointLight per lantern would add a shadow pass each.
export function Lantern({ x, z, y = 1 }: { x: number; z: number; y?: number }) {
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, 0.6, 0]} castShadow>
        <boxGeometry args={[0.12, 1.2, 0.12]} />
        <meshStandardMaterial color="#3b2a1a" />
      </mesh>
      <mesh position={[0, 1.35, 0]} castShadow>
        <boxGeometry args={[0.36, 0.36, 0.36]} />
        <meshStandardMaterial color="#ffe9a8" emissive="#ffc857" emissiveIntensity={0.9} />
      </mesh>
      <mesh position={[0, 1.58, 0]}>
        <boxGeometry args={[0.44, 0.1, 0.44]} />
        <meshStandardMaterial color="#3b2a1a" />
      </mesh>
    </group>
  )
}
