// src/game/world/props/TreePine.tsx
export function TreePine({ x, z, scale = 1, rotation = 0 }: { x: number; z: number; scale?: number; rotation?: number }) {
  const tiers: [number, number][] = [[1.6, 0.9], [1.2, 1.7], [0.7, 2.4]] // [width, y]
  return (
    <group position={[x, 1, z]} scale={scale} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.4, 0]} castShadow>
        <boxGeometry args={[0.3, 0.8, 0.3]} />
        <meshStandardMaterial color="#4a2e14" roughness={0.9} />
      </mesh>
      {tiers.map(([w, y], i) => (
        <mesh key={i} position={[0, y, 0]} castShadow>
          <boxGeometry args={[w, 0.7, w]} />
          <meshStandardMaterial color={i === 2 ? '#3f8a35' : '#35772d'} />
        </mesh>
      ))}
    </group>
  )
}
