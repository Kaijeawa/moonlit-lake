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
  color?: string // flower colour; on a lilyPad the string 'flower' adds a blossom
}

// Keep-clear zones: spawn (3, 3) and the fishing spot (5, 3) — nothing within 1.0.
export const PROPS: PropPlacement[] = [
  // Dock runs from the east shore out over the water toward +x.
  { type: 'dock', x: 7.1, z: 3, rotation: 0 },
  { type: 'lantern', x: 4.4, z: 1.6 },
  { type: 'lantern', x: 4.4, z: 4.4 },
  // Lanterns along the sand path (west shore -> spawn -> dock)
  { type: 'lantern', x: -4.2, z: -1.2 },
  { type: 'lantern', x: -1, z: 1.4 },
  { type: 'lantern', x: 1.8, z: 0.8 },

  // Trees ring the island edge; the big sakura is the landmark
  { type: 'treeSakura', x: -2.5, z: -3.2, scale: 1.35, rotation: 0.4 },
  { type: 'treeRound', x: 0.8, z: -4.6, scale: 1.05, rotation: 1.1 },
  { type: 'treeRound', x: -4.6, z: 1.6, scale: 0.95, rotation: 2.3 },
  { type: 'treeRound', x: 3.2, z: -4.2, scale: 0.85, rotation: 0.7 },
  { type: 'treeSakura', x: -3.6, z: 3.6, scale: 0.9, rotation: 1.9 },
  { type: 'treePine', x: -4.8, z: -2.6, scale: 1.1 },
  { type: 'treePine', x: 2.4, z: -1.8, scale: 0.85 },
  { type: 'treePine', x: 4.4, z: -2.4, scale: 1 },
  { type: 'treePine', x: -0.8, z: 5, scale: 0.9 },
  { type: 'treePine', x: 1.6, z: 5.3, scale: 0.75 },

  // Bushes fill the gaps under the trees
  { type: 'bush', x: -1.4, z: 4.2, rotation: 0.5 },
  { type: 'bush', x: 1, z: 4.4, scale: 0.8, rotation: 1.4 },
  { type: 'bush', x: -4.2, z: -0.4, scale: 0.9 },
  { type: 'bush', x: 2.1, z: -3.2, scale: 0.7, rotation: 2.1 },
  { type: 'bush', x: -1.2, z: -4.4, scale: 0.85 },
  { type: 'bush', x: 5, z: -0.6, scale: 0.75, rotation: 0.9 },
  { type: 'bush', x: -3, z: 1.4, scale: 0.65 },

  // Lily pads + reeds in the water near the dock and shore
  { type: 'lilyPad', x: 7.4, z: 0.6 },
  { type: 'lilyPad', x: 8.6, z: 1.4, scale: 1.3, color: 'flower' },
  { type: 'lilyPad', x: 9.4, z: 4.9, scale: 0.9 },
  { type: 'lilyPad', x: 6.9, z: 5.6, color: 'flower' },
  { type: 'lilyPad', x: 5.6, z: 6.4, scale: 0.8 },
  { type: 'lilyPad', x: -6.9, z: 2.1 },
  { type: 'lilyPad', x: -7.4, z: 0.4, scale: 1.2, color: 'flower' },
  { type: 'lilyPad', x: -2.4, z: 6.9, scale: 0.8 },
  { type: 'lilyPad', x: 3.4, z: -6.9 },
  { type: 'lilyPad', x: -4.8, z: -5.4, scale: 0.9, color: 'flower' },
  { type: 'lilyPad', x: 8.2, z: -0.8, scale: 0.7 },
  { type: 'reeds', x: 6.5, z: 5.9 },
  { type: 'reeds', x: 8.4, z: 5.4, scale: 0.9 },
  { type: 'reeds', x: -6.6, z: -1.4 },
  { type: 'reeds', x: 1.4, z: 7 },
  { type: 'reeds', x: -1, z: 7.2, scale: 0.8 },
  { type: 'reeds', x: 6.4, z: 0 },
  { type: 'reeds', x: -6.3, z: 3.2, scale: 0.85 },

  // Flowers on the grass, away from the path
  { type: 'flower', x: -2.2, z: 2.4, color: '#e88fc4' },
  { type: 'flower', x: -3.4, z: -1.6, color: '#f2e58a' },
  { type: 'flower', x: 0.4, z: 3.2, color: '#b9a3e6' },
  { type: 'flower', x: 2.6, z: 4.6, color: '#e88fc4' },
  { type: 'flower', x: -0.6, z: -2.6, color: '#f2e58a' },
  { type: 'flower', x: 3.8, z: -3.4, color: '#b9a3e6' },
  { type: 'flower', x: -4.4, z: 3.9, color: '#f2e58a' },
  { type: 'flower', x: 1.6, z: -4.2, color: '#e88fc4' },
  { type: 'flower', x: -2.8, z: 4.8, color: '#b9a3e6' },
  { type: 'flower', x: 4.6, z: 0.4, color: '#f2e58a' },
  { type: 'flower', x: -1.8, z: -1.4, color: '#e88fc4' },
  { type: 'flower', x: 0.2, z: -3.6, color: '#b9a3e6' },
]
