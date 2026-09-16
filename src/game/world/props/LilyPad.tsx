// src/game/world/props/LilyPad.tsx
// Flat hex disc just above the water plane (y = -0.2). Rotation is seeded from
// position so pads keep their angle when Scene re-renders (movementLocked flips).
export function LilyPad({ x, z, scale = 1, flower = false }: { x: number; z: number; scale?: number; flower?: boolean }) {
  const rot = ((Math.abs(x * 31 + z * 17) % 7) / 7) * Math.PI
  return (
    <group position={[x, -0.16, z]} rotation={[0, rot, 0]} scale={scale}>
      <mesh receiveShadow>
        <cylinderGeometry args={[0.35, 0.35, 0.05, 6]} />
        <meshStandardMaterial color="#cfe3a4" roughness={0.8} />
      </mesh>
      {flower && (
        <mesh position={[0.1, 0.1, 0.05]} castShadow>
          <boxGeometry args={[0.18, 0.14, 0.18]} />
          <meshStandardMaterial color="#f2a7c9" />
        </mesh>
      )}
    </group>
  )
}
