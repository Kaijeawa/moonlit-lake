// src/game/world/props/Dock.tsx
import type { ThreeEvent } from '@react-three/fiber'

const PLANK_W = 2.4
const PLANK_L = 3.2
const DECK_Y = 1.05
const PLANK_COUNT = 8

export function Dock({
  x,
  z,
  rotation = 0,
  onClick,
}: {
  x: number
  z: number
  rotation?: number
  onClick?: (event: ThreeEvent<MouseEvent>) => void
}) {
  const posts: [number, number][] = [
    [-PLANK_L / 2 + 0.3, -PLANK_W / 2 + 0.2],
    [-PLANK_L / 2 + 0.3, PLANK_W / 2 - 0.2],
    [PLANK_L / 2 - 0.3, -PLANK_W / 2 + 0.2],
    [PLANK_L / 2 - 0.3, PLANK_W / 2 - 0.2],
  ]
  const plankL = PLANK_L / PLANK_COUNT
  return (
    <group position={[x, 0, z]} rotation={[0, rotation, 0]}>
      {/* Individual planks with a hairline gap read as wood rather than one slab.
          Marked walkable so click-to-move works on the deck, same as the island. */}
      {Array.from({ length: PLANK_COUNT }, (_, i) => (
        <mesh
          key={i}
          position={[-PLANK_L / 2 + plankL * (i + 0.5), DECK_Y, 0]}
          userData={{ walkable: true }}
          onClick={onClick}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[plankL - 0.04, 0.12, PLANK_W]} />
          <meshStandardMaterial color={i % 2 ? '#c8873f' : '#bd7d38'} roughness={0.9} />
        </mesh>
      ))}
      {posts.map(([px, pz], i) => (
        <mesh key={i} position={[px, 0.3, pz]} castShadow>
          <boxGeometry args={[0.22, 1.6, 0.22]} />
          <meshStandardMaterial color="#5a3a1e" roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}
