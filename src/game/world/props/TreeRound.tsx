// src/game/world/props/TreeRound.tsx
// Trunk + three offset canopy blocks. Canopy colours can be overridden for the sakura variant.
export function TreeRound({
  x,
  z,
  scale = 1,
  rotation = 0,
  canopy = ['#4f9a3c', '#63b24a', '#58a742'],
}: {
  x: number
  z: number
  scale?: number
  rotation?: number
  canopy?: [string, string, string]
}) {
  return (
    <group position={[x, 1, z]} scale={scale} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.6, 0]} castShadow>
        <boxGeometry args={[0.4, 1.2, 0.4]} />
        <meshStandardMaterial color="#5a3a1e" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.6, 0]} castShadow>
        <boxGeometry args={[1.8, 1.2, 1.8]} />
        <meshStandardMaterial color={canopy[0]} />
      </mesh>
      <mesh position={[0.4, 2.3, -0.3]} castShadow>
        <boxGeometry args={[1.2, 0.9, 1.2]} />
        <meshStandardMaterial color={canopy[1]} />
      </mesh>
      <mesh position={[-0.5, 2.1, 0.4]} castShadow>
        <boxGeometry args={[0.9, 0.7, 0.9]} />
        <meshStandardMaterial color={canopy[2]} />
      </mesh>
    </group>
  )
}
