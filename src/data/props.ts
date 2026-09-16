// src/data/props.ts
// Placement list for every decorative prop. Coordinates are world x/z; the
// island top is y = 1 and the water plane is y = -0.2. Edit numbers here to
// move things — the components under src/game/world/props/ only render.
export type PropType =
  | 'dock'
  | 'lantern'
  | 'treeRound'
  | 'treePine'
  | 'treeSakura'
  | 'bush'
  | 'lilyPad'
  | 'reeds'
  | 'flower'

export type PropPlacement = {
  type: PropType
  x: number
  z: number
  rotation?: number // radians around Y
  scale?: number
  color?: string
}

// Keep-clear zones: spawn (3, 3) and the fishing spot (5, 3) — nothing within 1.0.
export const PROPS: PropPlacement[] = [
  // Dock runs from the east shore out over the water toward +x.
  { type: 'dock', x: 7.1, z: 3, rotation: 0 },
  { type: 'lantern', x: 4.4, z: 1.6 },
  { type: 'lantern', x: 4.4, z: 4.4 },
]
