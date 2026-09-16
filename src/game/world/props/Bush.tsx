// src/game/world/props/Bush.tsx
export function Bush({ x, z, scale = 1, rotation = 0 }: { x: number; z: number; scale?: number; rotation?: number }) {
  return (
    <group position={[x, 1, z]} scale={scale} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.3, 0]} castShadow>
        <boxGeometry args={[0.9, 0.6, 0.9]} />
        <meshStandardMaterial color="#4f9a3c" />
      </mesh>
      <mesh position={[0.3, 0.55, 0.2]} castShadow>
        <boxGeometry args={[0.5, 0.4, 0.5]} />
        <meshStandardMaterial color="#63b24a" />
      </mesh>
    </group>
  )
}
