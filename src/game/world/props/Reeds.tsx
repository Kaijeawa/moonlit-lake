// src/game/world/props/Reeds.tsx
export function Reeds({ x, z, scale = 1 }: { x: number; z: number; scale?: number }) {
  const stalks: [number, number, number][] = [
    [0, 0.9, 0],
    [0.18, 0.7, 0.1],
    [-0.15, 1.1, -0.12],
    [0.05, 0.8, -0.2],
  ]
  return (
    <group position={[x, -0.2, z]} scale={scale}>
      {stalks.map(([sx, h, sz], i) => (
        <mesh key={i} position={[sx, h / 2, sz]} castShadow>
          <boxGeometry args={[0.08, h, 0.08]} />
          <meshStandardMaterial color="#7fb35a" />
        </mesh>
      ))}
    </group>
  )
}
