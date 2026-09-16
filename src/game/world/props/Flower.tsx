// src/game/world/props/Flower.tsx
export function Flower({ x, z, color = '#e88fc4' }: { x: number; z: number; color?: string }) {
  return (
    <group position={[x, 1, z]}>
      <mesh position={[0, 0.12, 0]}>
        <boxGeometry args={[0.05, 0.24, 0.05]} />
        <meshStandardMaterial color="#5f9c3e" />
      </mesh>
      <mesh position={[0, 0.28, 0]}>
        <boxGeometry args={[0.16, 0.12, 0.16]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  )
}
