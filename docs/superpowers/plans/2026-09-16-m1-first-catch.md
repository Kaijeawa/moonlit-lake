# Moonlit Lake — M1: First Catch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A walkable player character, one fishing spot, three fish species,
a working timing-bar minigame, and a save/load round-trip through
localStorage. This is M1 per the spec — no shop, no quests, no NPC, no
day/night phase transitions yet (those are M2/M3).

**Architecture:** Extends M0's scene with a player (click-to-move via
raycast against the island's `walkable` layer), a fishing-spot trigger
volume, and a minigame UI overlay. Introduces Zustand stores for the first
time (`usePlayerStore`, `useInventoryStore`, `useFishingStore`), plus the
first orchestrator (`resolveCatch.ts`) and the persistence layer. Per spec
Section 4's hard rules: `useFrame`/refs own per-frame transient state,
React state only fires on discrete events (zone enter/exit, catch result),
and orchestrators — not stores calling stores — own cross-store effects.

**Tech Stack:** Same as M0 (Vite, React 19, TypeScript, R3F 9, drei,
Vitest) plus `zustand` (already installed in M0, unused until now).

**Spec:** `docs/superpowers/specs/2026-09-15-moonlit-lake-design.md`

## Global Constraints

- **Island surface is at y = 1.0.** M0's `buildIslandGeometry` builds each
  tile as a `BoxGeometry(1, height=1, 1)` translated to `y = height/2`, so
  boxes span y ∈ [0, 1] and the walkable top face is at y = 1. Every
  ground-contact coordinate in this plan (player spawn, click targets,
  fishing-spot marker) lives at y ≈ 1, never y = 0.
- **Island tiles exist only where `sqrt(x² + z²) ≤ 6` for integer x, z**
  (M0's `ISLAND_GRID`). Any world position placed "on the island" must
  satisfy this — e.g. (4, 4) is on-island (dist 5.66), (6, 2) is NOT
  (dist 6.32, that's water).
- **The player's `positionRef` is the ground-contact point** (y = 1 on the
  island). The rendered capsule is offset upward so its feet touch the
  ground; the offset lives in `Player.tsx` only.
- Player position is NOT persisted (spec Section 5) — always spawns at the
  dock coordinate on load.
- Raycast for click-to-move accepts hits only where `face.normal.y > 0.7`
  on a mesh tagged `userData.walkable === true` (spec Section 5) — the
  Island mesh already carries this tag from M0.
- No pathfinding — straight-line lerp to the click target only (spec
  Section 5, v1 scope).
- **One canonical source of truth for fish data.** `FISH` in
  `src/data/fish.ts` is the only place species data lives. The inventory
  stores per-catch records (`{ fishId, weight, caughtAt }`), never copies
  of `Fish` objects, so a later change to a species' name or weight range
  never leaves stale data in saves.
- Stores never call stores. Cross-store effects go through
  `resolveCatch.ts` (spec Section 4, hard rule 2; Section 6).
- Save format is `{ version: 1, data }`; unknown/corrupt version or
  malformed shape → back up under a `-backup` key, then discard and start
  fresh — no migration layer (spec Section 5). M0 had no persistence, so
  there is no prior save format to stay compatible with; version 1 is the
  first.
- Persistence flushes on debounce AND on `visibilitychange`/`beforeunload`
  (spec Section 2 revision).
- Fish gating for M1 is spot + time-of-day only. Rod-tier gating
  (`minRod`) is part of the fish data model per spec Section 3, but M1
  ships with exactly one rod tier (no shop yet). Do not build a shop or
  rod-upgrade UI in this plan — that's M2.
- Bait is fenced out of v1 entirely (spec Section 3) — no bait parameter
  anywhere in this plan's code.
- **Type imports:** use `import type { RefObject } from 'react'` /
  `import type { CSSProperties } from 'react'` rather than the `React.`
  namespace, and `import type { ThreeEvent } from '@react-three/fiber'`.
  `verbatimModuleSyntax` is on — type-only imports must use `import type`.
- `noUnusedLocals`/`noUnusedParameters` are on — never leave an unused
  import (it is a build error, not a warning).
- **Type-check with `npx tsc -p tsconfig.app.json --noEmit`, never bare
  `npx tsc --noEmit`.** The root `tsconfig.json` is a solution file
  (`files: []` + references), so bare `tsc --noEmit` type-checks nothing
  and exits 0 unconditionally (verified 2026-09-16 by injecting a type
  error). Wherever a task step below says `npx tsc --noEmit`, run the
  `-p tsconfig.app.json` form instead.
- Build gate before every commit: `npx tsc -p tsconfig.app.json --noEmit && npm run build`
  (`npm run build` runs `tsc -b`, which is the authoritative check).
- `strict: true` is on in both tsconfigs (set in M0) — all new code must
  satisfy it, not silently disable it.
- Every commit message ends with the line
  `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

---

### Task 1: Fish data model (pure logic, unit tested)

**Files:**
- Create: `src/data/fish.ts`
- Create: `src/data/fish.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces:
  - `export type TimeOfDay = 'day' | 'night'`
  - `export type Fish = { id: string; name: string; spotId: string; timeOfDay: TimeOfDay; minRod: number; weightRange: [number, number] }`
  - `export const FISH: Fish[]`
  - `export function getFishById(id: string): Fish | undefined`
  - `export function getAvailableFish(spotId: string, timeOfDay: TimeOfDay, rodTier: number): Fish[]`
  - `export function rollWeight(fish: Fish, random?: () => number): number`
  - Task 6 (`resolveCatch.ts`), Task 8 (`FishingBar.tsx`), and Task 9
    (`persistence.ts`, for validating saved `fishId`s) consume these.

- [ ] **Step 1: Write the failing test**

```ts
// src/data/fish.test.ts
import { describe, it, expect } from 'vitest'
import { FISH, getAvailableFish, getFishById, rollWeight } from './fish'

describe('FISH data integrity', () => {
  it('has unique ids', () => {
    const ids = FISH.map((f) => f.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('has a valid weight range on every fish', () => {
    for (const f of FISH) {
      expect(f.weightRange[0]).toBeGreaterThan(0)
      expect(f.weightRange[1]).toBeGreaterThanOrEqual(f.weightRange[0])
    }
  })
})

describe('getFishById', () => {
  it('finds a fish by id', () => {
    expect(getFishById('carp')?.name).toBe('Carp')
  })

  it('returns undefined for an unknown id', () => {
    expect(getFishById('nope')).toBeUndefined()
  })
})

describe('getAvailableFish', () => {
  it('returns only fish matching spot and time-of-day', () => {
    const result = getAvailableFish('dock', 'day', 1)
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((f) => f.spotId === 'dock' && f.timeOfDay === 'day')).toBe(true)
  })

  it('returns nothing at night when no night fish exist yet (M1 data)', () => {
    expect(getAvailableFish('dock', 'night', 99)).toEqual([])
  })

  it('excludes fish requiring a higher rod tier than provided', () => {
    const highTierFish = FISH.find((f) => f.minRod > 1)
    expect(highTierFish).toBeDefined()
    const result = getAvailableFish(highTierFish!.spotId, highTierFish!.timeOfDay, 1)
    expect(result.find((f) => f.id === highTierFish!.id)).toBeUndefined()
  })

  it('includes a fish once rodTier meets its minRod', () => {
    const highTierFish = FISH.find((f) => f.minRod > 1)!
    const result = getAvailableFish(highTierFish.spotId, highTierFish.timeOfDay, highTierFish.minRod)
    expect(result.find((f) => f.id === highTierFish.id)).toBeDefined()
  })

  it('returns empty array for an unknown spot', () => {
    expect(getAvailableFish('nonexistent-spot', 'day', 99)).toEqual([])
  })
})

describe('rollWeight', () => {
  it('returns the minimum when random yields 0', () => {
    const fish = FISH[0]
    expect(rollWeight(fish, () => 0)).toBe(fish.weightRange[0])
  })

  it('returns the maximum when random yields just under 1', () => {
    const fish = FISH[0]
    expect(rollWeight(fish, () => 0.999999)).toBeCloseTo(fish.weightRange[1], 1)
  })

  it('always stays within the fish weight range', () => {
    const fish = FISH[0]
    for (let i = 0; i < 100; i++) {
      const w = rollWeight(fish)
      expect(w).toBeGreaterThanOrEqual(fish.weightRange[0])
      expect(w).toBeLessThanOrEqual(fish.weightRange[1])
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/fish.test.ts`
Expected: FAIL — `fish.ts` doesn't exist.

- [ ] **Step 3: Write the implementation**

```ts
// src/data/fish.ts
export type TimeOfDay = 'day' | 'night'

export type Fish = {
  id: string
  name: string
  spotId: string
  timeOfDay: TimeOfDay
  minRod: number
  weightRange: [number, number]
}

// M1 ships one spot ('dock') and daytime only. Night fish, two more spots
// and their species arrive in M3 with the day/night cycle. Golden Koi is
// rod-tier 2 so the rod gate is real data, even though no rod upgrade
// exists until M2.
export const FISH: Fish[] = [
  { id: 'carp', name: 'Carp', spotId: 'dock', timeOfDay: 'day', minRod: 1, weightRange: [1.2, 4.5] },
  { id: 'perch', name: 'Perch', spotId: 'dock', timeOfDay: 'day', minRod: 1, weightRange: [0.4, 1.5] },
  { id: 'golden-koi', name: 'Golden Koi', spotId: 'dock', timeOfDay: 'day', minRod: 2, weightRange: [0.8, 2.0] },
]

export function getFishById(id: string): Fish | undefined {
  return FISH.find((f) => f.id === id)
}

export function getAvailableFish(spotId: string, timeOfDay: TimeOfDay, rodTier: number): Fish[] {
  return FISH.filter(
    (f) => f.spotId === spotId && f.timeOfDay === timeOfDay && rodTier >= f.minRod
  )
}

// Rounded to 0.1 kg so saves and the future Collection Book show tidy
// numbers. `random` is injectable for deterministic tests.
export function rollWeight(fish: Fish, random: () => number = Math.random): number {
  const [min, max] = fish.weightRange
  const raw = min + random() * (max - min)
  return Math.round(raw * 10) / 10
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/data/fish.test.ts`
Expected: PASS, all tests green.

- [ ] **Step 5: Commit**

```bash
git add src/data/fish.ts src/data/fish.test.ts
git commit -m "Add fish data model with spot/time/rod-tier gating and weight roll"
```

---

### Task 2: Zustand stores

**Files:**
- Create: `src/stores/usePlayerStore.ts`
- Create: `src/stores/useInventoryStore.ts`
- Create: `src/stores/useFishingStore.ts`
- Create: `src/stores/useInventoryStore.test.ts`

**Interfaces:**
- Consumes: nothing from Task 1 at the type level — the inventory stores
  `fishId` strings, not `Fish` objects (canonical-source-of-truth rule).
- Produces:
  - `usePlayerStore`: `{ rodTier: number; reset: () => void }` (fixed at
    1 for M1, no upgrade path yet — M2 adds `upgradeRod()`).
  - `export type CaughtFish = { fishId: string; weight: number; caughtAt: number }`
    (`caughtAt` is `Date.now()` epoch ms).
  - `useInventoryStore`: `{ coins: number; catches: CaughtFish[]; addCatch: (record: CaughtFish) => void; reset: () => void }`
  - `useFishingStore`: `{ nearSpotId: string | null; setNearSpot: (spotId: string | null) => void; reset: () => void }`
  - Task 6 (`resolveCatch.ts`) consumes `useInventoryStore.getState().addCatch`.
  - Task 5 (`FishingSpot.tsx`) consumes `useFishingStore`'s `setNearSpot`.
  - Task 9 (`persistence.ts`) consumes `usePlayerStore`/`useInventoryStore`
    state shape and the `CaughtFish` type for serialization.

- [ ] **Step 1: Write the stores**

```ts
// src/stores/usePlayerStore.ts
import { create } from 'zustand'

type PlayerState = {
  rodTier: number
  reset: () => void
}

const initialState = { rodTier: 1 }

export const usePlayerStore = create<PlayerState>((set) => ({
  ...initialState,
  reset: () => set(initialState),
}))
```

```ts
// src/stores/useInventoryStore.ts
import { create } from 'zustand'

export type CaughtFish = {
  fishId: string
  weight: number
  caughtAt: number
}

type InventoryState = {
  coins: number
  catches: CaughtFish[]
  addCatch: (record: CaughtFish) => void
  reset: () => void
}

const initialState = { coins: 0, catches: [] as CaughtFish[] }

export const useInventoryStore = create<InventoryState>((set) => ({
  ...initialState,
  addCatch: (record) => set((state) => ({ catches: [...state.catches, record] })),
  reset: () => set(initialState),
}))
```

```ts
// src/stores/useFishingStore.ts
import { create } from 'zustand'

type FishingState = {
  nearSpotId: string | null
  setNearSpot: (spotId: string | null) => void
  reset: () => void
}

const initialState = { nearSpotId: null as string | null }

export const useFishingStore = create<FishingState>((set) => ({
  ...initialState,
  setNearSpot: (spotId) => set({ nearSpotId: spotId }),
  reset: () => set(initialState),
}))
```

- [ ] **Step 2: Write a test for the inventory store (the one with real logic)**

```ts
// src/stores/useInventoryStore.test.ts
import { describe, it, expect, afterEach } from 'vitest'
import { useInventoryStore, type CaughtFish } from './useInventoryStore'

const record: CaughtFish = { fishId: 'carp', weight: 2.3, caughtAt: 1_700_000_000_000 }

describe('useInventoryStore', () => {
  afterEach(() => {
    useInventoryStore.getState().reset()
  })

  it('starts with zero coins and no catches', () => {
    expect(useInventoryStore.getState().coins).toBe(0)
    expect(useInventoryStore.getState().catches).toEqual([])
  })

  it('addCatch appends without mutating the previous array', () => {
    const before = useInventoryStore.getState().catches
    useInventoryStore.getState().addCatch(record)
    const after = useInventoryStore.getState().catches
    expect(after).toHaveLength(1)
    expect(after[0]).toEqual(record)
    expect(before).toHaveLength(0)
    expect(after).not.toBe(before)
  })

  it('reset clears catches back to empty', () => {
    useInventoryStore.getState().addCatch(record)
    useInventoryStore.getState().reset()
    expect(useInventoryStore.getState().catches).toEqual([])
  })
})
```

- [ ] **Step 3: Run the test**

Run: `npx vitest run src/stores/useInventoryStore.test.ts`
Expected: PASS, all 3 tests green.

- [ ] **Step 4: Run the build gate**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/stores/
git commit -m "Add player/inventory/fishing Zustand stores"
```

---

### Task 3: Player component and click-to-move controller

**Files:**
- Create: `src/game/player/usePlayerController.ts`
- Create: `src/game/player/Player.tsx`

**Interfaces:**
- Consumes: nothing from earlier M1 tasks (this is scene/input code, not
  store-driven per the hard rule — position is a ref, not Zustand state).
- Produces:
  - `export function usePlayerController(): { positionRef: RefObject<THREE.Vector3>; setTarget: (point: THREE.Vector3) => void }`
  - `export function Player(props: { positionRef: RefObject<THREE.Vector3> }): JSX.Element`
  - `usePlayerController` is called ONCE, by the scene root in Task 4, and
    its `positionRef` is passed down to `Player`, `IsoCamera` (Task 4) and
    `FishingSpot` (Task 5) — one shared ref, never one hook call per
    consumer.

- [ ] **Step 1: Write the controller hook**

```ts
// src/game/player/usePlayerController.ts
import { useRef, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const MOVE_SPEED = 4 // world units per second
// Ground-contact point on the island surface (y = 1). Tile (4, 4) is on
// the island (dist 5.66 ≤ 6). Not persisted — every load spawns here.
const DOCK_SPAWN = new THREE.Vector3(4, 1, 4)
const ARRIVE_EPSILON = 0.05

export function usePlayerController() {
  const positionRef = useRef(DOCK_SPAWN.clone())
  const targetRef = useRef<THREE.Vector3 | null>(null)
  const scratch = useRef(new THREE.Vector3())

  const setTarget = useCallback((point: THREE.Vector3) => {
    targetRef.current = point.clone()
  }, [])

  useFrame((_, delta) => {
    const target = targetRef.current
    if (!target) return

    const pos = positionRef.current
    const toTarget = scratch.current.subVectors(target, pos)
    const distance = toTarget.length()

    if (distance < ARRIVE_EPSILON) {
      pos.copy(target)
      targetRef.current = null
      return
    }

    const step = Math.min(MOVE_SPEED * delta, distance)
    pos.add(toTarget.normalize().multiplyScalar(step))
  })

  return { positionRef, setTarget }
}
```

- [ ] **Step 2: Write the Player component**

```tsx
// src/game/player/Player.tsx
import { useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh, Vector3 } from 'three'

// Capsule radius 0.3 + half-length 0.3 = 0.6: lifts the capsule so its
// feet sit on the ground-contact point instead of its center.
const CAPSULE_RADIUS = 0.3
const CAPSULE_LENGTH = 0.6
const FEET_OFFSET = CAPSULE_RADIUS + CAPSULE_LENGTH / 2

export function Player({ positionRef }: { positionRef: RefObject<Vector3> }) {
  const meshRef = useRef<Mesh>(null)

  useFrame(() => {
    const mesh = meshRef.current
    const pos = positionRef.current
    if (!mesh || !pos) return
    mesh.position.set(pos.x, pos.y + FEET_OFFSET, pos.z)
  })

  return (
    <mesh ref={meshRef} castShadow>
      <capsuleGeometry args={[CAPSULE_RADIUS, CAPSULE_LENGTH, 4, 8]} />
      <meshStandardMaterial color="#e0a458" />
    </mesh>
  )
}
```

`Player` is a placeholder capsule — spec Section 6 says the GLB character
pack is picked at implementation start; that swap is a later, separate
change and must not block M1 gameplay.

- [ ] **Step 3: Run the build gate**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: exit 0. (Nothing renders `Player` yet — Task 4 wires it in.)

- [ ] **Step 4: Commit**

```bash
git add src/game/player/
git commit -m "Add player component and click-to-move controller"
```

---

### Task 4: Click-to-move raycast wiring and camera follow

**Files:**
- Modify: `src/game/world/Island.tsx` (forward an `onClick` prop)
- Modify: `src/game/camera/IsoCamera.tsx` (follow a position ref with a lerp instead of a static lookAt)
- Modify: `src/App.tsx` (extract a `Scene` that owns the controller, wire raycast-on-click, render `Player`)

**Interfaces:**
- Consumes: `usePlayerController`, `Player` (Task 3), `Island`'s
  `userData.walkable` tag (M0).
- Produces: a working click-to-move loop end to end; the player's
  `positionRef` becomes the single source of truth `IsoCamera` and
  `FishingSpot` (Task 5) both read. `Scene` accepts a `movementLocked`
  boolean prop (always `false` until Task 8 uses it to freeze movement
  while the minigame is open).

- [ ] **Step 1: Read the current files before editing**

Read `src/App.tsx`, `src/game/world/Island.tsx`, and
`src/game/camera/IsoCamera.tsx` as they exist on disk. The snippets below
are complete replacements for each — but confirm nothing else has crept
into those files since this plan was written before overwriting.

- [ ] **Step 2: Let Island forward a click handler**

```tsx
// src/game/world/Island.tsx
import { useMemo } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { ISLAND_GRID, buildIslandGeometry } from '../../data/island'

export function Island({ onClick }: { onClick?: (event: ThreeEvent<MouseEvent>) => void }) {
  const geometry = useMemo(() => buildIslandGeometry(ISLAND_GRID), [])

  return (
    <mesh
      geometry={geometry}
      userData={{ walkable: true }}
      receiveShadow
      castShadow
      onClick={onClick}
    >
      <meshStandardMaterial vertexColors roughness={0.9} />
    </mesh>
  )
}
```

(The old `import type {} from '@react-three/fiber'` safety-net line is
replaced by the real `ThreeEvent` type import, which loads the same JSX
augmentation.)

- [ ] **Step 3: Make IsoCamera follow the player with a lerp**

```tsx
// src/game/camera/IsoCamera.tsx
import { useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'

// Fixed perspective camera at a locked ~50deg elevation, matching the
// reference screenshot's foreshortening (spec Section 5). No user
// rotation or zoom in v1 (spec Section 3). Follows the player with a
// short lerp so the view eases instead of snapping.
const CAMERA_DISTANCE = 14
const CAMERA_ELEVATION_DEG = 50
const FOLLOW_LERP = 0.12

const rad = (CAMERA_ELEVATION_DEG * Math.PI) / 180
const OFFSET_Y = Math.sin(rad) * CAMERA_DISTANCE
// Split across X and Z so the combined horizontal radius is cos(rad)*D.
const OFFSET_XZ = (Math.cos(rad) * CAMERA_DISTANCE) / Math.SQRT2

export function IsoCamera({ targetRef }: { targetRef: RefObject<THREE.Vector3> }) {
  const camRef = useRef<THREE.PerspectiveCamera>(null)
  const smoothTarget = useRef<THREE.Vector3 | null>(null)

  useFrame(() => {
    const cam = camRef.current
    const target = targetRef.current
    if (!cam || !target) return

    if (!smoothTarget.current) {
      smoothTarget.current = target.clone()
    }
    const smooth = smoothTarget.current
    smooth.lerp(target, FOLLOW_LERP)

    cam.position.set(smooth.x + OFFSET_XZ, smooth.y + OFFSET_Y, smooth.z + OFFSET_XZ)
    cam.lookAt(smooth)
  })

  return <PerspectiveCamera ref={camRef} makeDefault fov={40} near={0.1} far={200} />
}
```

The elevation/distance math is unchanged from M0's reviewed version; only
the target now moves with the player instead of staying at the origin.

- [ ] **Step 4: Wire the scene and the raycast in App.tsx**

```tsx
// src/App.tsx
import { useState, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import type { Vector3 } from 'three'
import { Island } from './game/world/Island'
import { Water } from './game/world/Water'
import { IsoCamera } from './game/camera/IsoCamera'
import { Player } from './game/player/Player'
import { usePlayerController } from './game/player/usePlayerController'
import { WebGLFallback } from './WebGLFallback'

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return !!(window.WebGL2RenderingContext && canvas.getContext('webgl2'))
  } catch {
    return false
  }
}

// Only top faces of the walkable island count as a move target, so a
// click on a cliff wall never lerps the player through terrain.
const WALKABLE_NORMAL_Y = 0.7

function Scene({ movementLocked }: { movementLocked: boolean }) {
  const { positionRef, setTarget } = usePlayerController()

  const handleGroundClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      if (movementLocked) return
      const hit = event.intersections.find(
        (i) => i.object.userData.walkable === true && i.face !== null && i.face !== undefined && i.face.normal.y > WALKABLE_NORMAL_Y
      )
      if (!hit) return
      event.stopPropagation()
      setTarget(hit.point as Vector3)
    },
    [movementLocked, setTarget]
  )

  return (
    <>
      <IsoCamera targetRef={positionRef} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 15, 5]} intensity={1.2} castShadow />
      <Island onClick={handleGroundClick} />
      <Water />
      <Player positionRef={positionRef} />
    </>
  )
}

export default function App() {
  const [webglOk] = useState(hasWebGL)

  if (!webglOk) {
    return <WebGLFallback />
  }

  return (
    <Canvas shadows style={{ width: '100vw', height: '100vh' }}>
      <Scene movementLocked={false} />
    </Canvas>
  )
}
```

- [ ] **Step 5: Run the build gate**

Run: `npx tsc -p tsconfig.app.json --noEmit && npm run build`
Expected: both exit 0.

- [ ] **Step 6: Manual verification**

Run `npm run dev`, click around the island. Expected: the player capsule
stands ON the island surface (not buried in it), moves smoothly toward each
click point in a straight line, the camera eases after it, clicking on
water does nothing (raycast only accepts `walkable`-tagged top faces).

- [ ] **Step 7: Commit**

```bash
git add src/game/world/Island.tsx src/game/camera/IsoCamera.tsx src/App.tsx
git commit -m "Wire click-to-move raycast and lerped camera follow"
```

---

### Task 5: Fishing spot and proximity trigger

**Files:**
- Create: `src/game/world/FishingSpot.tsx`
- Modify: `src/App.tsx` (add the spot to `Scene`)

**Interfaces:**
- Consumes: `useFishingStore` (Task 2), the shared `positionRef` (Task 3/4).
- Produces: `export function FishingSpot(props: { id: string; position: [number, number, number]; playerPositionRef: RefObject<THREE.Vector3> }): JSX.Element`.
  Renders a visual marker and drives `useFishingStore`'s `nearSpotId` on
  ENTER/EXIT transitions only (spec Section 5's discrete-event rule).

- [ ] **Step 1: Write the FishingSpot component**

```tsx
// src/game/world/FishingSpot.tsx
import { useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useFishingStore } from '../../stores/useFishingStore'

const TRIGGER_RADIUS = 1.5

export function FishingSpot({
  id,
  position,
  playerPositionRef,
}: {
  id: string
  position: [number, number, number]
  playerPositionRef: RefObject<THREE.Vector3>
}) {
  const wasNearRef = useRef(false)
  const spotPos = useRef(new THREE.Vector3(...position))

  useFrame(() => {
    const player = playerPositionRef.current
    if (!player) return
    const isNear = player.distanceTo(spotPos.current) < TRIGGER_RADIUS

    // ENTER/EXIT transition only — never write to the store every frame.
    if (isNear !== wasNearRef.current) {
      wasNearRef.current = isNear
      useFishingStore.getState().setNearSpot(isNear ? id : null)
    }
  })

  return (
    <mesh position={position}>
      <cylinderGeometry args={[0.4, 0.4, 0.1, 16]} />
      <meshStandardMaterial color="#f4c95d" />
    </mesh>
  )
}
```

- [ ] **Step 2: Add the spot to the scene**

In `src/App.tsx`, import it and render it inside `Scene`, after `<Water />`.
Tile (5, 3) is an on-island shoreline tile (dist 5.83 ≤ 6); the marker sits
just above the y = 1 surface:

```tsx
import { FishingSpot } from './game/world/FishingSpot'
// ...inside Scene's returned fragment:
<FishingSpot id="dock" position={[5, 1.05, 3]} playerPositionRef={positionRef} />
```

- [ ] **Step 3: Run the build gate**

Run: `npx tsc -p tsconfig.app.json --noEmit && npm run build`
Expected: both exit 0.

- [ ] **Step 4: Manual verification**

Run `npm run dev`. Click next to the yellow disc at (5, 3) so the player
walks onto it. Temporarily add
`useFishingStore.subscribe((s) => console.log('nearSpotId', s.nearSpotId))`
at the top of `Scene` (or use React devtools) and confirm it logs `'dock'`
exactly once on entry and `null` exactly once on exit — not every frame.
Remove the temporary log before committing.

- [ ] **Step 5: Commit**

```bash
git add src/game/world/FishingSpot.tsx src/App.tsx
git commit -m "Add fishing spot with proximity-triggered store update"
```

---

### Task 6: Catch orchestrator (pure logic, unit tested)

**Files:**
- Create: `src/game/fishing/resolveCatch.ts`
- Create: `src/game/fishing/resolveCatch.test.ts`

**Interfaces:**
- Consumes: `useInventoryStore`, `CaughtFish` (Task 2), `Fish` (Task 1).
- Produces: `export function resolveCatch(fish: Fish, weight: number, now?: () => number): CaughtFish`
  — called by Task 8's `FishingBar` on a Perfect/Good result. Returns the
  record it stored so the UI can show it. This is the one place
  cross-store effects happen (spec Section 4, hard rule 2). M1 has no
  quests yet, so it only touches inventory — do NOT add a placeholder
  `quest.onFishCaught()` call now (YAGNI; M3 adds it when it exists).

- [ ] **Step 1: Write the failing test**

```ts
// src/game/fishing/resolveCatch.test.ts
import { describe, it, expect, afterEach } from 'vitest'
import { resolveCatch } from './resolveCatch'
import { useInventoryStore } from '../../stores/useInventoryStore'
import { FISH } from '../../data/fish'

const NOW = 1_700_000_000_000

describe('resolveCatch', () => {
  afterEach(() => {
    useInventoryStore.getState().reset()
  })

  it('stores a catch record referencing the fish by id, not the Fish object', () => {
    const record = resolveCatch(FISH[0], 2.3, () => NOW)
    expect(record).toEqual({ fishId: FISH[0].id, weight: 2.3, caughtAt: NOW })
    expect(useInventoryStore.getState().catches).toEqual([record])
  })

  it('accumulates across multiple calls', () => {
    resolveCatch(FISH[0], 1.5, () => NOW)
    resolveCatch(FISH[1], 0.9, () => NOW + 1)
    const catches = useInventoryStore.getState().catches
    expect(catches).toHaveLength(2)
    expect(catches.map((c) => c.fishId)).toEqual([FISH[0].id, FISH[1].id])
  })

  it('defaults caughtAt to the current time', () => {
    const before = Date.now()
    const record = resolveCatch(FISH[0], 1.0)
    expect(record.caughtAt).toBeGreaterThanOrEqual(before)
    expect(record.caughtAt).toBeLessThanOrEqual(Date.now())
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/game/fishing/resolveCatch.test.ts`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Write the implementation**

```ts
// src/game/fishing/resolveCatch.ts
import type { Fish } from '../../data/fish'
import { useInventoryStore, type CaughtFish } from '../../stores/useInventoryStore'

export function resolveCatch(fish: Fish, weight: number, now: () => number = Date.now): CaughtFish {
  const record: CaughtFish = { fishId: fish.id, weight, caughtAt: now() }
  useInventoryStore.getState().addCatch(record)
  return record
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/game/fishing/resolveCatch.test.ts`
Expected: PASS, all 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/game/fishing/resolveCatch.ts src/game/fishing/resolveCatch.test.ts
git commit -m "Add resolveCatch orchestrator"
```

---

### Task 7: Fishing minigame scoring logic (pure logic, unit tested)

**Files:**
- Create: `src/game/fishing/scoring.ts`
- Create: `src/game/fishing/scoring.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `export type CatchResult = 'perfect' | 'good' | 'miss'`,
  `export type Zones = { greenStart: number; greenEnd: number; perfectStart: number; perfectEnd: number }`,
  `export function scoreCast(pointerPosition: number, zones: Zones): CatchResult`.
  Task 8 (`FishingBar.tsx`) consumes this to turn a bar position into a
  result without embedding the scoring math in a React component (keeps it
  unit-testable per spec Section 8).

- [ ] **Step 1: Write the failing test**

```ts
// src/game/fishing/scoring.test.ts
import { describe, it, expect } from 'vitest'
import { scoreCast, type Zones } from './scoring'

const zones: Zones = { greenStart: 30, greenEnd: 70, perfectStart: 45, perfectEnd: 55 }

describe('scoreCast', () => {
  it('returns perfect when pointer is inside the perfect zone', () => {
    expect(scoreCast(50, zones)).toBe('perfect')
  })

  it('returns good when pointer is inside the green zone but outside perfect', () => {
    expect(scoreCast(35, zones)).toBe('good')
    expect(scoreCast(65, zones)).toBe('good')
  })

  it('returns miss when pointer is outside the green zone entirely', () => {
    expect(scoreCast(10, zones)).toBe('miss')
    expect(scoreCast(90, zones)).toBe('miss')
  })

  it('treats zone boundaries as inclusive', () => {
    expect(scoreCast(30, zones)).toBe('good')
    expect(scoreCast(70, zones)).toBe('good')
    expect(scoreCast(45, zones)).toBe('perfect')
    expect(scoreCast(55, zones)).toBe('perfect')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/game/fishing/scoring.test.ts`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Write the implementation**

```ts
// src/game/fishing/scoring.ts
export type CatchResult = 'perfect' | 'good' | 'miss'

export type Zones = {
  greenStart: number
  greenEnd: number
  perfectStart: number
  perfectEnd: number
}

export function scoreCast(pointerPosition: number, zones: Zones): CatchResult {
  if (pointerPosition >= zones.perfectStart && pointerPosition <= zones.perfectEnd) {
    return 'perfect'
  }
  if (pointerPosition >= zones.greenStart && pointerPosition <= zones.greenEnd) {
    return 'good'
  }
  return 'miss'
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/game/fishing/scoring.test.ts`
Expected: PASS, all 4 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/game/fishing/scoring.ts src/game/fishing/scoring.test.ts
git commit -m "Add fishing minigame scoring logic"
```

---

### Task 8: FishingBar minigame UI and HUD prompt

**Files:**
- Create: `src/ui/FishingBar.tsx`
- Create: `src/ui/HUD.tsx`
- Modify: `src/App.tsx` (render HUD/FishingBar as siblings of `<Canvas>`, open the bar from the HUD prompt, lock movement while it is open)

**Interfaces:**
- Consumes: `useFishingStore`, `useInventoryStore`, `usePlayerStore`
  (Task 2), `getAvailableFish`, `getFishById`, `rollWeight`, `TimeOfDay`
  (Task 1), `scoreCast`, `Zones` (Task 7), `resolveCatch` (Task 6).
- Produces:
  - `export function FishingBar(props: { spotId: string; timeOfDay: TimeOfDay; onClose: () => void }): JSX.Element`
  - `export function HUD(props: { onFish: (spotId: string) => void }): JSX.Element`

- [ ] **Step 1: Write the FishingBar component**

Per spec Section 6: pointer position updates via ref/rAF, `setState` only
on the Perfect/Good/Miss result (the discrete-event rule applies inside
this overlay too, not just at the 3D boundary). Per spec Section 7: the
per-frame delta is clamped so a backgrounded tab can't skip the whole
green zone in one frame.

```tsx
// src/ui/FishingBar.tsx
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { getAvailableFish, getFishById, rollWeight } from '../data/fish'
import type { TimeOfDay } from '../data/fish'
import { usePlayerStore } from '../stores/usePlayerStore'
import { scoreCast } from '../game/fishing/scoring'
import type { CatchResult, Zones } from '../game/fishing/scoring'
import { resolveCatch } from '../game/fishing/resolveCatch'
import type { CaughtFish } from '../stores/useInventoryStore'

const BAR_WIDTH = 300
const ZONES: Zones = { greenStart: 100, greenEnd: 200, perfectStart: 140, perfectEnd: 160 }
const SWEEP_SPEED = 200 // px per second
const MAX_FRAME_DELTA = 0.05 // seconds — a backgrounded tab can't jump the zone

type Outcome = { result: CatchResult; catch: CaughtFish | null }

export function FishingBar({
  spotId,
  timeOfDay,
  onClose,
}: {
  spotId: string
  timeOfDay: TimeOfDay
  onClose: () => void
}) {
  const pointerRef = useRef<HTMLDivElement>(null)
  const positionRef = useRef(0)
  const directionRef = useRef(1)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const rodTier = usePlayerStore((s) => s.rodTier)

  useEffect(() => {
    if (outcome) return
    let frameId = 0
    let last = performance.now()

    const tick = (now: number) => {
      const delta = Math.min((now - last) / 1000, MAX_FRAME_DELTA)
      last = now
      positionRef.current += directionRef.current * SWEEP_SPEED * delta
      if (positionRef.current >= BAR_WIDTH || positionRef.current <= 0) {
        directionRef.current *= -1
        positionRef.current = Math.max(0, Math.min(BAR_WIDTH, positionRef.current))
      }
      if (pointerRef.current) {
        pointerRef.current.style.transform = `translateX(${positionRef.current}px)`
      }
      frameId = requestAnimationFrame(tick)
    }
    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [outcome])

  const handleCast = () => {
    const result = scoreCast(positionRef.current, ZONES)
    if (result === 'miss') {
      setOutcome({ result, catch: null })
      return
    }
    const available = getAvailableFish(spotId, timeOfDay, rodTier)
    if (available.length === 0) {
      setOutcome({ result, catch: null })
      return
    }
    const fish = available[Math.floor(Math.random() * available.length)]
    const record = resolveCatch(fish, rollWeight(fish))
    setOutcome({ result, catch: record })
  }

  const caughtName = outcome?.catch ? getFishById(outcome.catch.fishId)?.name ?? outcome.catch.fishId : null

  return (
    <div style={overlayStyle}>
      <div style={{ position: 'relative', width: BAR_WIDTH, height: 24, background: '#333' }}>
        <div style={{ position: 'absolute', left: ZONES.greenStart, width: ZONES.greenEnd - ZONES.greenStart, height: '100%', background: '#4a9d4a' }} />
        <div style={{ position: 'absolute', left: ZONES.perfectStart, width: ZONES.perfectEnd - ZONES.perfectStart, height: '100%', background: '#2f7d2f' }} />
        <div ref={pointerRef} style={{ position: 'absolute', top: -4, width: 4, height: 32, background: '#fff' }} />
      </div>
      {!outcome ? (
        <button onClick={handleCast} style={{ marginTop: 12 }}>Cast!</button>
      ) : (
        <>
          <p style={{ color: '#fff', marginTop: 12 }}>
            {outcome.result.toUpperCase()}!
            {outcome.catch ? ` You caught a ${caughtName} (${outcome.catch.weight} kg)` : ''}
          </p>
          <button onClick={onClose} style={{ marginTop: 4 }}>Close</button>
        </>
      )}
    </div>
  )
}

const overlayStyle: CSSProperties = {
  position: 'fixed',
  bottom: 40,
  left: '50%',
  transform: 'translateX(-50%)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  background: 'rgba(0,0,0,0.6)',
  padding: 16,
  borderRadius: 8,
}
```

- [ ] **Step 2: Write the HUD component**

Per spec Section 6: the container uses `pointer-events: none` with
interactive children `auto`, so a HUD click never also triggers a
world click-to-move.

```tsx
// src/ui/HUD.tsx
import { useFishingStore } from '../stores/useFishingStore'
import { useInventoryStore } from '../stores/useInventoryStore'

export function HUD({ onFish }: { onFish: (spotId: string) => void }) {
  const nearSpotId = useFishingStore((s) => s.nearSpotId)
  const coins = useInventoryStore((s) => s.coins)
  const caughtCount = useInventoryStore((s) => s.catches.length)

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', top: 16, left: 16, color: '#fff', pointerEvents: 'auto' }}>
        Coins: {coins} | Fish caught: {caughtCount}
      </div>
      {nearSpotId && (
        <button
          onClick={() => onFish(nearSpotId)}
          style={{ position: 'absolute', bottom: 40, right: 40, pointerEvents: 'auto' }}
        >
          Fish
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Wire both into App.tsx**

Modify the `App` component (keep `Scene` as written in Task 4/5):

```tsx
// src/App.tsx — additional imports
import { HUD } from './ui/HUD'
import { FishingBar } from './ui/FishingBar'

// src/App.tsx — App component
export default function App() {
  const [webglOk] = useState(hasWebGL)
  const [fishingSpotId, setFishingSpotId] = useState<string | null>(null)

  if (!webglOk) {
    return <WebGLFallback />
  }

  return (
    <>
      <Canvas shadows style={{ width: '100vw', height: '100vh' }}>
        <Scene movementLocked={fishingSpotId !== null} />
      </Canvas>
      <HUD onFish={setFishingSpotId} />
      {fishingSpotId && (
        <FishingBar
          spotId={fishingSpotId}
          timeOfDay="day"
          onClose={() => setFishingSpotId(null)}
        />
      )}
    </>
  )
}
```

`timeOfDay="day"` is hardcoded for M1 — the day/night cycle
(`useWorldStore`, quantized phase) is M3 scope. A deliberate, temporary
simplification, not a bug. `movementLocked` stops a ground click from
walking the player away from the spot mid-cast.

- [ ] **Step 4: Run the build gate**

Run: `npx tsc -p tsconfig.app.json --noEmit && npm run build`
Expected: both exit 0.

- [ ] **Step 5: Manual verification**

Run `npm run dev`. Walk to the fishing spot — the "Fish" button appears.
Click it: the timing bar opens and sweeps; clicking the island while it is
open does NOT move the player. Click "Cast!" — a Perfect/Good/Miss result
shows, with the species and weight on a hit. Close it; on a non-miss the
HUD's "Fish caught" counter has incremented.

- [ ] **Step 6: Commit**

```bash
git add src/ui/FishingBar.tsx src/ui/HUD.tsx src/App.tsx
git commit -m "Add fishing minigame UI and HUD prompt"
```

---

### Task 9: Persistence (save/load round-trip)

**Files:**
- Create: `src/lib/persistence.ts`
- Create: `src/lib/persistence.test.ts`
- Modify: `src/App.tsx` (call `loadGame()` on mount, wire debounced
  `saveGame()` + flush on visibilitychange/beforeunload)

**Interfaces:**
- Consumes: `usePlayerStore`, `useInventoryStore`, `CaughtFish` (Task 2),
  `getFishById` (Task 1).
- Produces: `export function saveGame(): void`, `export function loadGame(): void`,
  `export const SAVE_KEY: string`, `export const BACKUP_KEY: string`,
  `export const SAVE_VERSION: number`.

- [ ] **Step 1: Write the failing test**

Tests use a minimal in-memory localStorage shim since Vitest's default
`environment: 'node'` (set in M0) has no `localStorage` global.

```ts
// src/lib/persistence.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'

const storage = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => storage.get(k) ?? null,
  setItem: (k: string, v: string) => storage.set(k, v),
  removeItem: (k: string) => storage.delete(k),
})

import { saveGame, loadGame, SAVE_KEY, BACKUP_KEY, SAVE_VERSION } from './persistence'
import { useInventoryStore } from '../stores/useInventoryStore'
import { usePlayerStore } from '../stores/usePlayerStore'

const carp = { fishId: 'carp', weight: 2.3, caughtAt: 1_700_000_000_000 }

describe('persistence', () => {
  beforeEach(() => {
    storage.clear()
    useInventoryStore.getState().reset()
    usePlayerStore.getState().reset()
  })

  it('round-trips inventory and player state through save and load', () => {
    useInventoryStore.getState().addCatch(carp)
    usePlayerStore.setState({ rodTier: 2 })
    saveGame()
    useInventoryStore.getState().reset()
    usePlayerStore.getState().reset()
    expect(useInventoryStore.getState().catches).toHaveLength(0)
    loadGame()
    expect(useInventoryStore.getState().catches).toEqual([carp])
    expect(usePlayerStore.getState().rodTier).toBe(2)
  })

  it('writes a versioned envelope', () => {
    saveGame()
    const parsed = JSON.parse(storage.get(SAVE_KEY)!)
    expect(parsed.version).toBe(SAVE_VERSION)
    expect(parsed.data).toBeDefined()
  })

  it('backs up and discards on corrupt JSON, starting fresh', () => {
    storage.set(SAVE_KEY, 'not valid json{{{')
    loadGame()
    expect(useInventoryStore.getState().catches).toHaveLength(0)
    expect(storage.get(BACKUP_KEY)).toBe('not valid json{{{')
    expect(storage.has(SAVE_KEY)).toBe(false)
  })

  it('backs up and discards on an unknown save version', () => {
    storage.set(SAVE_KEY, JSON.stringify({ version: 999, data: {} }))
    loadGame()
    expect(useInventoryStore.getState().catches).toHaveLength(0)
    expect(storage.get(BACKUP_KEY)).toBeDefined()
  })

  it('backs up and discards a malformed shape at the right version', () => {
    storage.set(SAVE_KEY, JSON.stringify({ version: SAVE_VERSION, data: { player: 'nope' } }))
    expect(() => loadGame()).not.toThrow()
    expect(useInventoryStore.getState().catches).toHaveLength(0)
    expect(storage.get(BACKUP_KEY)).toBeDefined()
  })

  it('drops catch records whose fishId no longer exists, keeps the rest', () => {
    const ghost = { fishId: 'extinct-fish', weight: 1, caughtAt: 1 }
    storage.set(
      SAVE_KEY,
      JSON.stringify({ version: SAVE_VERSION, data: { player: { rodTier: 1 }, inventory: { coins: 5, catches: [carp, ghost] } } })
    )
    loadGame()
    expect(useInventoryStore.getState().catches).toEqual([carp])
    expect(useInventoryStore.getState().coins).toBe(5)
  })

  it('load with no existing save is a no-op, not an error', () => {
    expect(() => loadGame()).not.toThrow()
    expect(useInventoryStore.getState().catches).toHaveLength(0)
  })

  it('save never throws when localStorage is unavailable', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('denied') },
      setItem: () => { throw new Error('denied') },
      removeItem: () => { throw new Error('denied') },
    })
    expect(() => saveGame()).not.toThrow()
    expect(() => loadGame()).not.toThrow()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => storage.get(k) ?? null,
      setItem: (k: string, v: string) => storage.set(k, v),
      removeItem: (k: string) => storage.delete(k),
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/persistence.test.ts`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/persistence.ts
import { getFishById } from '../data/fish'
import { usePlayerStore } from '../stores/usePlayerStore'
import { useInventoryStore, type CaughtFish } from '../stores/useInventoryStore'

export const SAVE_KEY = 'moonlit-lake-save'
export const BACKUP_KEY = `${SAVE_KEY}-backup`
export const SAVE_VERSION = 1

type SaveData = {
  player: { rodTier: number }
  inventory: { coins: number; catches: CaughtFish[] }
}

type Envelope = { version: number; data: SaveData }

export function saveGame(): void {
  try {
    const data: SaveData = {
      player: { rodTier: usePlayerStore.getState().rodTier },
      inventory: {
        coins: useInventoryStore.getState().coins,
        catches: useInventoryStore.getState().catches,
      },
    }
    const envelope: Envelope = { version: SAVE_VERSION, data }
    localStorage.setItem(SAVE_KEY, JSON.stringify(envelope))
  } catch {
    // localStorage unavailable (private browsing, quota, disabled): the
    // game keeps running in memory for this session. Never throw.
  }
}

export function loadGame(): void {
  let raw: string | null
  try {
    raw = localStorage.getItem(SAVE_KEY)
  } catch {
    return
  }
  if (!raw) return

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    backupAndDiscard(raw)
    return
  }

  const data = validate(parsed)
  if (!data) {
    backupAndDiscard(raw)
    return
  }

  usePlayerStore.setState({ rodTier: data.player.rodTier })
  useInventoryStore.setState({ coins: data.inventory.coins, catches: data.inventory.catches })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isCaughtFish(value: unknown): value is CaughtFish {
  return (
    isRecord(value) &&
    typeof value.fishId === 'string' &&
    typeof value.weight === 'number' &&
    Number.isFinite(value.weight) &&
    typeof value.caughtAt === 'number'
  )
}

// Returns a clean SaveData or null. Unknown fish ids are dropped rather
// than failing the whole load, so retiring a species never wipes a save.
function validate(parsed: unknown): SaveData | null {
  if (!isRecord(parsed) || parsed.version !== SAVE_VERSION || !isRecord(parsed.data)) return null
  const { player, inventory } = parsed.data
  if (!isRecord(player) || typeof player.rodTier !== 'number') return null
  if (!isRecord(inventory) || typeof inventory.coins !== 'number' || !Array.isArray(inventory.catches)) return null

  const catches = inventory.catches.filter(
    (c): c is CaughtFish => isCaughtFish(c) && getFishById(c.fishId) !== undefined
  )
  return {
    player: { rodTier: player.rodTier },
    inventory: { coins: inventory.coins, catches },
  }
}

function backupAndDiscard(raw: string): void {
  try {
    localStorage.setItem(BACKUP_KEY, raw)
    localStorage.removeItem(SAVE_KEY)
  } catch {
    // best-effort — if this fails too, the corrupt entry is simply ignored
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/persistence.test.ts`
Expected: PASS, all 8 tests green.

- [ ] **Step 5: Wire load-on-mount and debounced save into App.tsx**

Add a small hook next to `App` (same file, or `src/lib/useAutosave.ts` if
you prefer — either is fine as long as `App.tsx` stays readable) and call
it from `App` BEFORE the WebGL early return so hook order is stable:

```tsx
// src/App.tsx — additional imports
import { useEffect, useRef } from 'react'
import { saveGame, loadGame } from './lib/persistence'
import { useInventoryStore } from './stores/useInventoryStore'
import { usePlayerStore } from './stores/usePlayerStore'

const SAVE_DEBOUNCE_MS = 1000

function useAutosave() {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    loadGame()

    const scheduleSave = () => {
      if (timeoutRef.current !== undefined) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(saveGame, SAVE_DEBOUNCE_MS)
    }
    const flush = () => {
      if (timeoutRef.current !== undefined) clearTimeout(timeoutRef.current)
      saveGame()
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flush()
    }

    const unsubInventory = useInventoryStore.subscribe(scheduleSave)
    const unsubPlayer = usePlayerStore.subscribe(scheduleSave)
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('beforeunload', flush)

    return () => {
      unsubInventory()
      unsubPlayer()
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('beforeunload', flush)
      if (timeoutRef.current !== undefined) clearTimeout(timeoutRef.current)
    }
  }, [])
}

export default function App() {
  const [webglOk] = useState(hasWebGL)
  const [fishingSpotId, setFishingSpotId] = useState<string | null>(null)
  useAutosave()

  if (!webglOk) {
    return <WebGLFallback />
  }
  // ...rest unchanged from Task 8
}
```

Note: `loadGame()` runs inside the effect (after first paint) rather than
during render, so hydration of store state is a discrete event, not a
render-time side effect. React StrictMode in dev runs this effect twice;
`loadGame` is idempotent and `subscribe` returns its unsubscribe, so the
double-run is harmless.

- [ ] **Step 6: Run the build gate**

Run: `npx tsc -p tsconfig.app.json --noEmit && npm run build`
Expected: both exit 0.

- [ ] **Step 7: Manual verification (this is M1's visible-progress checkpoint)**

Run `npm run dev`. Catch a fish (Perfect or Good result). Wait ~1 s, reload
the page. Expected: the HUD's "Fish caught" counter still shows the catch —
the save/load round-trip works in the actual browser, not just in the unit
test's localStorage shim. Also check DevTools → Application → Local
Storage shows `moonlit-lake-save` with `{"version":1,...}`.

- [ ] **Step 8: Commit**

```bash
git add src/lib/persistence.ts src/lib/persistence.test.ts src/App.tsx
git commit -m "Add save/load persistence with validated envelope and flush-on-hide"
```

---

## Plan Self-Review

**Spec coverage:** M1's spec line ("One fishing spot, 3 fish species,
working minigame, save/load round-trip") is covered by Tasks 1
(fish data — three species, two catchable at rod 1, one gated behind
rod 2 so the gate is real data), 5 (spot), 7-8 (minigame), 9 (save/load).
Player movement/camera-follow (Tasks 3-4) aren't named in M1's one-line
description but are load-bearing prerequisites — you can't reach a
fishing spot without a player. Rod-tier gating exists in the data model
per the spec's decided mechanic, but no shop/upgrade UI is built
(correctly deferred to M2). Bait is absent everywhere. Day/night phase is
hardcoded to `'day'` for M1, not built out. Spec Section 7's
backgrounded-tab delta clamp is in Task 8; Section 5's ENTER/EXIT-only
proximity rule is in Task 5; Section 6's `pointer-events` rule is in
Task 8's HUD; Section 5's versioned envelope + backup-and-discard is in
Task 9.

**Placeholder scan:** no TBDs. The two deliberate simplifications
(`timeOfDay="day"` hardcoded; capsule placeholder instead of a GLB
character) are explicitly called out as intentional, not left silent.

**Type consistency:** `Fish`/`TimeOfDay` (Task 1) are used identically in
Task 8. `CaughtFish` (Task 2) is the record type in Task 6
(`resolveCatch` returns it), Task 8 (`Outcome.catch`), and Task 9
(`SaveData.inventory.catches`). `usePlayerController`'s
`positionRef`/`setTarget` (Task 3) are threaded consistently through Task
4's `IsoCamera`/`Player` and Task 5's `FishingSpot` props as
`RefObject<THREE.Vector3>`. `useFishingStore.nearSpotId` (Task 2) is
written by Task 5's `FishingSpot` and read by Task 8's `HUD`; `HUD`'s
`onFish(spotId)` matches `App`'s `setFishingSpotId`. `Zones` (Task 7) is
the shape `FishingBar` (Task 8) passes to `scoreCast`.

**Geometry consistency:** every world coordinate uses the y = 1 surface
convention from Global Constraints — spawn (4, 1, 4), spot marker
(5, 1.05, 3), and click targets come from top-face hits at y ≈ 1. Both
named tiles satisfy the on-island radius check.
