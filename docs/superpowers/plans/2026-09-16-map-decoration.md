# Moonlit Lake — Map Decoration Plan (M1b, user-requested 2026-09-16)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Sequential tasks; every task ends with a `$B` screenshot.

**Goal:** Make the island look like the reference screenshots: wooden dock
with lanterns, voxel trees and bushes, lily pads and reeds in the water,
a sand path with flowers. Fishing work (M1 Task 9 save/load) is paused
until the user asks for it.

**Architecture:** All props are procedural `three` box/cylinder geometry —
no GLB downloads, no new dependencies. One component per prop type under
`src/game/world/props/`, each rendering from a placement list in
`src/data/props.ts` (`{ type, x, z, rotation?, scale? }`). Placements are
data so the user can move things by editing coordinates. Props are never
`walkable`; click-to-move keeps filtering on `userData.walkable` so props
don't capture movement clicks. Everything renders inside the existing
`<Suspense>` in `Scene`.

**Spec:** `docs/superpowers/specs/2026-09-15-moonlit-lake-design.md`
(Section 6 allows procedural placeholders; asset swap is a later change.)

## Global Constraints

- Island top is y = 1; water plane y = -0.2; island tiles exist where
  `sqrt(x²+z²) ≤ 6` (M0 `ISLAND_GRID`). Anything "on the island" sits at
  y = 1; anything "in the water" sits at y ≈ -0.15 and at radius > 6.
- The fishing spot is at (5, 1.05, 3); spawn is (3, 1, 3); keep both
  clear of props (no prop within 1.0 of either).
- Do NOT change lighting, camera, water material, `Island` click handling,
  or any fishing/store code.
- Draw-call budget: ≤ ~60 extra meshes total across all props for M1b.
  Trees are built from ≤ 6 boxes each; use `<group>` per prop.
- `import type` for types; `noUnusedLocals` is a build error; type-check
  via `npx tsc -p tsconfig.app.json --noEmit` (bare `tsc --noEmit` is a
  no-op here); gate `&& npm run build`; `npm test` must stay green.
- Plain commit messages, NO `Co-Authored-By` trailer.
- Every task: `npm run dev` + gstack `$B` screenshot, described concretely.

---

### Task D1: Placement data + dock + lanterns

**Files:**
- Create: `src/data/props.ts`
- Create: `src/game/world/props/Dock.tsx`
- Create: `src/game/world/props/Lantern.tsx`
- Create: `src/game/world/props/Props.tsx` (renders all placements)
- Modify: `src/App.tsx` (add `<Props />` inside `Scene` after `<FishingSpot …/>`)

- [ ] **Step 1: Placement data**

```ts
// src/data/props.ts
export type PropType = 'dock' | 'lantern' | 'treeRound' | 'treePine' | 'bush' | 'lilyPad' | 'reeds' | 'flower'

export type PropPlacement = {
  type: PropType
  x: number
  z: number
  rotation?: number // radians around Y
  scale?: number
}

// Dock runs from the shore tile (5,3) out over the water toward +x.
// Lanterns flank the dock entrance. More types are appended by later tasks.
export const PROPS: PropPlacement[] = [
  { type: 'dock', x: 6.5, z: 3, rotation: 0 },
  { type: 'lantern', x: 4.6, z: 2.2 },
  { type: 'lantern', x: 4.6, z: 3.8 },
]
```

- [ ] **Step 2: Dock**

```tsx
// src/game/world/props/Dock.tsx
const PLANK_W = 2.4
const PLANK_L = 3.2
const DECK_Y = 1.05

export function Dock({ x, z, rotation = 0 }: { x: number; z: number; rotation?: number }) {
  const posts: [number, number][] = [
    [-PLANK_L / 2 + 0.3, -PLANK_W / 2 + 0.2],
    [-PLANK_L / 2 + 0.3, PLANK_W / 2 - 0.2],
    [PLANK_L / 2 - 0.3, -PLANK_W / 2 + 0.2],
    [PLANK_L / 2 - 0.3, PLANK_W / 2 - 0.2],
  ]
  return (
    <group position={[x, 0, z]} rotation={[0, rotation, 0]}>
      <mesh position={[0, DECK_Y, 0]} castShadow receiveShadow>
        <boxGeometry args={[PLANK_L, 0.12, PLANK_W]} />
        <meshStandardMaterial color="#c8873f" roughness={0.9} />
      </mesh>
      {posts.map(([px, pz], i) => (
        <mesh key={i} position={[px, 0.3, pz]} castShadow>
          <boxGeometry args={[0.22, 1.6, 0.22]} />
          <meshStandardMaterial color="#5a3a1e" roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}
```

- [ ] **Step 3: Lantern**

```tsx
// src/game/world/props/Lantern.tsx
export function Lantern({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 1, z]}>
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
```

No `pointLight` per lantern (each would add a shadow pass); emissive only.

- [ ] **Step 4: Props renderer**

```tsx
// src/game/world/props/Props.tsx
import { PROPS } from '../../../data/props'
import { Dock } from './Dock'
import { Lantern } from './Lantern'

export function Props() {
  return (
    <>
      {PROPS.map((p, i) => {
        const key = `${p.type}-${i}`
        switch (p.type) {
          case 'dock': return <Dock key={key} x={p.x} z={p.z} rotation={p.rotation} />
          case 'lantern': return <Lantern key={key} x={p.x} z={p.z} />
          default: return null
        }
      })}
    </>
  )
}
```

Later tasks add cases; keep `default: return null` so unknown types never
crash.

- [ ] **Step 5: Wire + gate + screenshot + commit**
  `<Props />` after `<FishingSpot …/>` in `Scene`. Screenshot: plank pier
  extends from the shore near the yellow disc over the water; two
  glowing lanterns at its base; player can still click-walk on the
  island (click the island once and confirm movement).
  `git commit -m "Add placement data, dock and lanterns"`

---

### Task D2: Trees + bushes

**Files:** create `src/game/world/props/TreeRound.tsx`, `TreePine.tsx`,
`Bush.tsx`; modify `src/data/props.ts` (append placements) and
`Props.tsx` (add cases).

```tsx
// TreeRound.tsx — trunk + 3-box canopy
export function TreeRound({ x, z, scale = 1 }: { x: number; z: number; scale?: number }) {
  return (
    <group position={[x, 1, z]} scale={scale}>
      <mesh position={[0, 0.6, 0]} castShadow><boxGeometry args={[0.4, 1.2, 0.4]} /><meshStandardMaterial color="#5a3a1e" /></mesh>
      <mesh position={[0, 1.6, 0]} castShadow><boxGeometry args={[1.8, 1.2, 1.8]} /><meshStandardMaterial color="#4f9a3c" /></mesh>
      <mesh position={[0.4, 2.3, -0.3]} castShadow><boxGeometry args={[1.2, 0.9, 1.2]} /><meshStandardMaterial color="#63b24a" /></mesh>
      <mesh position={[-0.5, 2.1, 0.4]} castShadow><boxGeometry args={[0.9, 0.7, 0.9]} /><meshStandardMaterial color="#58a742" /></mesh>
    </group>
  )
}
```

```tsx
// TreePine.tsx — trunk + 3 shrinking tiers
export function TreePine({ x, z, scale = 1 }: { x: number; z: number; scale?: number }) {
  const tiers: [number, number][] = [[1.6, 0.9], [1.2, 1.7], [0.7, 2.4]] // [width, y]
  return (
    <group position={[x, 1, z]} scale={scale}>
      <mesh position={[0, 0.4, 0]} castShadow><boxGeometry args={[0.3, 0.8, 0.3]} /><meshStandardMaterial color="#4a2e14" /></mesh>
      {tiers.map(([w, y], i) => (
        <mesh key={i} position={[0, y, 0]} castShadow><boxGeometry args={[w, 0.7, w]} /><meshStandardMaterial color={i === 2 ? '#3f8a35' : '#35772d'} /></mesh>
      ))}
    </group>
  )
}
```

```tsx
// Bush.tsx
export function Bush({ x, z, scale = 1 }: { x: number; z: number; scale?: number }) {
  return (
    <group position={[x, 1, z]} scale={scale}>
      <mesh position={[0, 0.3, 0]} castShadow><boxGeometry args={[0.9, 0.6, 0.9]} /><meshStandardMaterial color="#4f9a3c" /></mesh>
      <mesh position={[0.3, 0.55, 0.2]} castShadow><boxGeometry args={[0.5, 0.4, 0.5]} /><meshStandardMaterial color="#63b24a" /></mesh>
    </group>
  )
}
```

Placements to append (all on-island, ≥ 1.0 from spawn (3,3) and spot (5,3)):
```ts
  { type: 'treeRound', x: -3, z: -3, scale: 1.1 },
  { type: 'treeRound', x: 0.5, z: -4.5 },
  { type: 'treePine', x: -4.5, z: 1 },
  { type: 'treePine', x: 2, z: -2, scale: 0.9 },
  { type: 'bush', x: -1.5, z: 4 },
  { type: 'bush', x: 1, z: 4.5, scale: 0.8 },
  { type: 'bush', x: -4, z: -0.5 },
```
Screenshot: trees cast shadows on the grass, none overlap the spawn/spot.
`git commit -m "Add voxel trees and bushes"`

---

### Task D3: Lily pads + reeds (in the water)

**Files:** create `src/game/world/props/LilyPad.tsx`, `Reeds.tsx`; append
placements; add cases.

```tsx
// LilyPad.tsx — flat disc just above the water plane (y = -0.2)
export function LilyPad({ x, z, scale = 1 }: { x: number; z: number; scale?: number }) {
  return (
    <mesh position={[x, -0.16, z]} rotation={[0, Math.random() * Math.PI, 0]} scale={scale} receiveShadow>
      <cylinderGeometry args={[0.35, 0.35, 0.05, 6]} />
      <meshStandardMaterial color="#cfe3a4" roughness={0.8} />
    </mesh>
  )
}
```
(`Math.random()` in the rotation is fine — it's cosmetic and runs once per
mount. If it ever needs to be deterministic, seed from `x*31+z`.)

```tsx
// Reeds.tsx — 3 thin stalks
export function Reeds({ x, z }: { x: number; z: number }) {
  const stalks: [number, number, number][] = [[0, 0.9, 0], [0.18, 0.7, 0.1], [-0.15, 1.1, -0.12]]
  return (
    <group position={[x, -0.2, z]}>
      {stalks.map(([sx, h, sz], i) => (
        <mesh key={i} position={[sx, h / 2, sz]} castShadow>
          <boxGeometry args={[0.08, h, 0.08]} />
          <meshStandardMaterial color="#7fb35a" />
        </mesh>
      ))}
    </group>
  )
}
```

Placements (radius > 6.3 so they're in the water, clustered near the dock/shore):
```ts
  { type: 'lilyPad', x: 7.4, z: 1.2 }, { type: 'lilyPad', x: 8.1, z: 2.6, scale: 1.3 },
  { type: 'lilyPad', x: 7.0, z: 5.0 }, { type: 'lilyPad', x: -6.8, z: 2.2 },
  { type: 'lilyPad', x: -2.5, z: 6.9, scale: 0.8 }, { type: 'lilyPad', x: 3.5, z: -6.9 },
  { type: 'reeds', x: 6.6, z: 5.6 }, { type: 'reeds', x: -6.5, z: -1.5 }, { type: 'reeds', x: 1.5, z: 7.0 },
```
Screenshot: pads float on the water surface (not sunk, not hovering), reeds
poke up from the water. `git commit -m "Add lily pads and reeds"`

---

### Task D4: Sand path + flowers

**Files:** modify `src/data/island.ts` (per-tile colour for a path),
create `src/game/world/props/Flower.tsx`, append placements, add case.

- [ ] Path: in `ISLAND_GRID`'s generator, colour tiles sand where they lie
  within 0.7 of the segment from (-5, 0) to (4, 3) (spawn → dock):

```ts
const SAND = '#e3d29a'
const GRASS = '#4a7c3a'
function distToSegment(px: number, pz: number, ax: number, az: number, bx: number, bz: number) {
  const abx = bx - ax, abz = bz - az
  const t = Math.max(0, Math.min(1, ((px - ax) * abx + (pz - az) * abz) / (abx * abx + abz * abz)))
  return Math.hypot(px - (ax + t * abx), pz - (az + t * abz))
}
// inside the tile loop:
const onPath = distToSegment(x, z, -5, 0, 4, 3) <= 0.7
tiles.push({ x, z, height: 1, color: onPath ? SAND : GRASS })
```
`island.test.ts` stays green (it asserts a colour attribute exists, not a
specific colour).

- [ ] Flowers:
```tsx
// Flower.tsx — tiny stem + coloured head
export function Flower({ x, z, color = '#e88fc4' }: { x: number; z: number; color?: string }) {
  return (
    <group position={[x, 1, z]}>
      <mesh position={[0, 0.12, 0]}><boxGeometry args={[0.05, 0.24, 0.05]} /><meshStandardMaterial color="#5f9c3e" /></mesh>
      <mesh position={[0, 0.28, 0]}><boxGeometry args={[0.16, 0.12, 0.16]} /><meshStandardMaterial color={color} /></mesh>
    </group>
  )
}
```
Add `color?: string` to `PropPlacement`. ~10 flowers on grass tiles away
from the path, mixing `#e88fc4`, `#f2e58a`, `#b9a3e6`.
Screenshot: sand strip from the west shore to the dock, flower dots on the
grass. `git commit -m "Add sand path and flowers"`

---

## After D4

Final `$B` screenshot from spawn for the user to judge against the
reference. Then decide with the user: resume M1 Task 9 (save/load), or
more decoration (bigger/irregular island, bridge, pagoda).
