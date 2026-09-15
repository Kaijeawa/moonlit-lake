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

- Player position is NOT persisted (spec Section 5) — always spawns at the
  dock coordinate on load.
- Raycast for click-to-move accepts hits only where `face.normal.y > 0.7`
  on a mesh tagged `userData.walkable === true` (spec Section 5) — the
  Island mesh already carries this tag from M0.
- No pathfinding — straight-line lerp to the click target only (spec
  Section 5, v1 scope).
- Stores never call stores. Cross-store effects go through
  `resolveCatch.ts` (spec Section 4, hard rule 2; Section 6).
- Save format is `{ version: 1, data }`; unknown/corrupt version → back up
  under a `-backup` key, then discard and start fresh — no migration layer
  (spec Section 5).
- Persistence flushes on debounce AND on `visibilitychange`/`beforeunload`
  (spec Section 2 revision).
- Fish gating for M1 is spot + time-of-day only. Rod-tier gating
  (`minRod`) is part of the fish data model per spec Section 3, but M1
  ships with exactly one implicit rod tier (no shop yet), so every fish's
  `minRod` is satisfied trivially — do not build a shop or rod-upgrade UI
  in this plan, that's M2.
- Bait is fenced out of v1 entirely (spec Section 3) — no bait parameter
  anywhere in this plan's code.
- Build gate before every commit: `npx tsc --noEmit && npm run build`.
- `strict: true` is on in both tsconfigs (set in M0) — all new code must
  satisfy it, not silently disable it.

---

### Task 1: Fish data model (pure logic, unit tested)

**Files:**
- Create: `src/data/fish.ts`
- Create: `src/data/fish.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces:
  - `export type Fish = { id: string; name: string; spotId: string; timeOfDay: 'day' | 'night'; minRod: number; weightRange: [number, number] }`
  - `export const FISH: Fish[]`
  - `export function getAvailableFish(spotId: string, timeOfDay: 'day' | 'night', rodTier: number): Fish[]`
  - Task 6 (`resolveCatch.ts`) and Task 8 (`FishingBar.tsx`) consume
    `getAvailableFish` and `Fish`.

- [ ] **Step 1: Write the failing test**

```ts
// src/data/fish.test.ts
import { describe, it, expect } from 'vitest'
import { FISH, getAvailableFish } from './fish'

describe('getAvailableFish', () => {
  it('returns only fish matching spot and time-of-day', () => {
    const result = getAvailableFish('dock', 'day', 1)
    expect(result.every((f) => f.spotId === 'dock' && f.timeOfDay === 'day')).toBe(true)
    expect(result.length).toBeGreaterThan(0)
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

  it('returns empty array for a spot/time combination with no matches', () => {
    const result = getAvailableFish('nonexistent-spot', 'day', 99)
    expect(result).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/fish.test.ts`
Expected: FAIL — `fish.ts` doesn't exist.

- [ ] **Step 3: Write the implementation**

```ts
// src/data/fish.ts
export type Fish = {
  id: string
  name: string
  spotId: string
  timeOfDay: 'day' | 'night'
  minRod: number
  weightRange: [number, number]
}

// M1 ships one spot ('dock'). Two more spots and their fish arrive in M3.
export const FISH: Fish[] = [
  { id: 'carp', name: 'Carp', spotId: 'dock', timeOfDay: 'day', minRod: 1, weightRange: [1.2, 4.5] },
  { id: 'catfish', name: 'Catfish', spotId: 'dock', timeOfDay: 'night', minRod: 1, weightRange: [2.0, 6.0] },
  { id: 'golden-koi', name: 'Golden Koi', spotId: 'dock', timeOfDay: 'day', minRod: 2, weightRange: [0.8, 2.0] },
]

export function getAvailableFish(spotId: string, timeOfDay: 'day' | 'night', rodTier: number): Fish[] {
  return FISH.filter(
    (f) => f.spotId === spotId && f.timeOfDay === timeOfDay && rodTier >= f.minRod
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/data/fish.test.ts`
Expected: PASS, all 4 assertions green.

- [ ] **Step 5: Commit**

```bash
git add src/data/fish.ts src/data/fish.test.ts
git commit -m "Add fish data model with spot/time/rod-tier gating"
```

---

### Task 2: Zustand stores

**Files:**
- Create: `src/stores/usePlayerStore.ts`
- Create: `src/stores/useInventoryStore.ts`
- Create: `src/stores/useFishingStore.ts`
- Create: `src/stores/useInventoryStore.test.ts`

**Interfaces:**
- Consumes: `Fish` type from `src/data/fish.ts` (Task 1).
- Produces:
  - `usePlayerStore`: `{ rodTier: number }` (fixed at 1 for M1, no upgrade
    path yet — M2 adds `upgradeRod()`).
  - `useInventoryStore`: `{ coins: number; caughtFish: Fish[]; addFish: (fish: Fish) => void; reset: () => void }`
  - `useFishingStore`: `{ nearSpotId: string | null; setNearSpot: (spotId: string | null) => void; reset: () => void }`
  - Task 6 (`resolveCatch.ts`) consumes `useInventoryStore.getState().addFish`.
  - Task 4 (`FishingSpot.tsx`) consumes `useFishingStore`'s `setNearSpot`.
  - Task 9 (`persistence.ts`) consumes `usePlayerStore`/`useInventoryStore`
    state shape for serialization.

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
import type { Fish } from '../data/fish'

type InventoryState = {
  coins: number
  caughtFish: Fish[]
  addFish: (fish: Fish) => void
  reset: () => void
}

const initialState = { coins: 0, caughtFish: [] as Fish[] }

export const useInventoryStore = create<InventoryState>((set) => ({
  ...initialState,
  addFish: (fish) => set((state) => ({ caughtFish: [...state.caughtFish, fish] })),
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
import { useInventoryStore } from './useInventoryStore'
import { FISH } from '../data/fish'

describe('useInventoryStore', () => {
  afterEach(() => {
    useInventoryStore.getState().reset()
  })

  it('starts with zero coins and no fish', () => {
    expect(useInventoryStore.getState().coins).toBe(0)
    expect(useInventoryStore.getState().caughtFish).toEqual([])
  })

  it('addFish appends to caughtFish without mutating the previous array', () => {
    const before = useInventoryStore.getState().caughtFish
    useInventoryStore.getState().addFish(FISH[0])
    const after = useInventoryStore.getState().caughtFish
    expect(after).toHaveLength(1)
    expect(after[0]).toBe(FISH[0])
    expect(before).toHaveLength(0) // original array untouched
  })

  it('reset clears caughtFish back to empty', () => {
    useInventoryStore.getState().addFish(FISH[0])
    useInventoryStore.getState().reset()
    expect(useInventoryStore.getState().caughtFish).toEqual([])
  })
})
```

- [ ] **Step 3: Run the test**

Run: `npx vitest run src/stores/useInventoryStore.test.ts`
Expected: PASS, all 3 assertions green.

- [ ] **Step 4: Run the build gate**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/stores/
git commit -m "Add player/inventory/fishing Zustand stores"
```

---

### Task 3: Player component and click-to-move controller

**Files:**
- Create: `src/game/player/Player.tsx`
- Create: `src/game/player/usePlayerController.ts`

**Interfaces:**
- Consumes: nothing from earlier M1 tasks (this is scene/input code, not
  store-driven per the hard rule — position is a ref, not Zustand state).
- Produces:
  - `export function Player(): JSX.Element`
  - `usePlayerController(): { positionRef: React.RefObject<THREE.Vector3>, setTarget: (point: THREE.Vector3) => void }`
  - Task 4 (`IsoCamera.tsx` update) consumes the player's position ref to
    follow it. Task 5 (`FishingSpot.tsx`) consumes the same ref for
    proximity checks.

- [ ] **Step 1: Write the controller hook**

```ts
// src/game/player/usePlayerController.ts
import { useRef, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const MOVE_SPEED = 4 // units per second
const DOCK_SPAWN = new THREE.Vector3(4, 0, 4)

export function usePlayerController() {
  const positionRef = useRef(new THREE.Vector3().copy(DOCK_SPAWN))
  const targetRef = useRef<THREE.Vector3 | null>(null)

  const setTarget = useCallback((point: THREE.Vector3) => {
    targetRef.current = point.clone()
  }, [])

  useFrame((_, delta) => {
    const target = targetRef.current
    if (!target) return

    const pos = positionRef.current
    const toTarget = target.clone().sub(pos)
    const distance = toTarget.length()

    if (distance < 0.05) {
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
import { useFrame } from '@react-three/fiber'
import type { Mesh } from 'three'
import { usePlayerController } from './usePlayerController'

export function Player() {
  const meshRef = useRef<Mesh>(null)
  const { positionRef } = usePlayerController()

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.copy(positionRef.current)
    }
  })

  return (
    <mesh ref={meshRef} castShadow>
      <capsuleGeometry args={[0.3, 0.6, 4, 8]} />
      <meshStandardMaterial color="#e0a458" />
    </mesh>
  )
}
```

Note: `usePlayerController` is called inside `Player`, so its returned
`positionRef` is local to that component instance in this task. Task 4's
camera-follow and Task 5's proximity check need the SAME ref — Task 4 lifts
`usePlayerController()` up into `App.tsx` and passes `positionRef`/
`setTarget` down as props to both `Player` and the raycast handler, rather
than each component calling the hook separately (which would create
independent, disconnected state). This restructuring happens in Task 4;
this task's `Player.tsx` as written above is correct for now and gets a
small prop-based signature change in Task 4's step.

- [ ] **Step 3: Run the build gate**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/game/player/
git commit -m "Add player component and click-to-move controller"
```

---

### Task 4: Click-to-move raycast wiring and camera follow

**Files:**
- Modify: `src/game/player/Player.tsx` (accept props instead of calling the hook internally)
- Modify: `src/game/camera/IsoCamera.tsx` (follow a position ref instead of a static lookAt target)
- Modify: `src/App.tsx` (own the controller, wire raycast-on-click, pass refs down)

**Interfaces:**
- Consumes: `usePlayerController` (Task 3), `Island`'s `userData.walkable`
  tag (M0).
- Produces: a working click-to-move loop end to end; the player's
  `positionRef` becomes the single source of truth `IsoCamera` and
  `FishingSpot` (Task 5) both read.

- [ ] **Step 1: Update Player to accept the controller as props**

```tsx
// src/game/player/Player.tsx
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh, Vector3 } from 'three'

export function Player({ positionRef }: { positionRef: React.RefObject<Vector3> }) {
  const meshRef = useRef<Mesh>(null)

  useFrame(() => {
    if (meshRef.current && positionRef.current) {
      meshRef.current.position.copy(positionRef.current)
    }
  })

  return (
    <mesh ref={meshRef} castShadow>
      <capsuleGeometry args={[0.3, 0.6, 4, 8]} />
      <meshStandardMaterial color="#e0a458" />
    </mesh>
  )
}
```

- [ ] **Step 2: Update IsoCamera to follow the player ref**

```tsx
// src/game/camera/IsoCamera.tsx
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import type { PerspectiveCamera as ThreePerspectiveCamera, Vector3 } from 'three'
// Redundant now that App.tsx imports @react-three/fiber, kept as a safety
// net if this file is ever used standalone.
import type {} from '@react-three/fiber'

const CAMERA_DISTANCE = 14
const CAMERA_ELEVATION_DEG = 50

export function IsoCamera({ targetRef }: { targetRef: React.RefObject<Vector3> }) {
  const camRef = useRef<ThreePerspectiveCamera>(null)
  const rad = (CAMERA_ELEVATION_DEG * Math.PI) / 180
  const y = Math.sin(rad) * CAMERA_DISTANCE
  const horizontal = (Math.cos(rad) * CAMERA_DISTANCE) / Math.SQRT2

  useFrame(() => {
    const cam = camRef.current
    const target = targetRef.current
    if (!cam || !target) return
    cam.position.set(target.x + horizontal, target.y + y, target.z + horizontal)
    cam.lookAt(target)
  })

  return (
    <PerspectiveCamera ref={camRef} makeDefault fov={40} near={0.1} far={200} />
  )
}
```

This changes M0's fixed-at-origin camera to follow the player. The
elevation/distance math is unchanged from M0's post-fix version — only the
lookAt target and position now move with `targetRef` instead of staying at
`[0,0,0]`.

- [ ] **Step 3: Wire raycast-on-click in App.tsx**

```tsx
// src/App.tsx (relevant additions — merge into the existing file from M0)
import { useState, useRef, useCallback } from 'react'
import { Canvas, useThree, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
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

function ClickToMoveGround({ onGroundClick }: { onGroundClick: (point: THREE.Vector3) => void }) {
  const handleClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      event.stopPropagation()
      const hit = event.intersections.find(
        (i) => i.object.userData.walkable === true && i.face && i.face.normal.y > 0.7
      )
      if (hit) onGroundClick(hit.point)
    },
    [onGroundClick]
  )
  return <Island onClick={handleClick} />
}

function Scene() {
  const { positionRef, setTarget } = usePlayerController()

  return (
    <>
      <IsoCamera targetRef={positionRef} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 15, 5]} intensity={1.2} castShadow />
      <ClickToMoveGround onGroundClick={setTarget} />
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
      <Scene />
    </Canvas>
  )
}
```

**Note for the implementer:** `Island` (from M0) does not currently accept
an `onClick` prop. Modify `src/game/world/Island.tsx` to forward one:

```tsx
// src/game/world/Island.tsx (modified)
import { useMemo } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { ISLAND_GRID, buildIslandGeometry } from '../../data/island'
// Redundant now that App.tsx imports @react-three/fiber, kept as a safety
// net if this file is ever used standalone.
import type {} from '@react-three/fiber'

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

- [ ] **Step 4: Run the build gate**

Run: `npx tsc --noEmit && npm run build`
Expected: both exit 0.

- [ ] **Step 5: Manual verification**

Run `npm run dev`, click around the island. Expected: the player capsule
moves smoothly toward each click point in a straight line, the camera
follows it, clicking on water does nothing (raycast only hits the
`walkable`-tagged island mesh).

- [ ] **Step 6: Commit**

```bash
git add src/game/player/Player.tsx src/game/camera/IsoCamera.tsx src/game/world/Island.tsx src/App.tsx
git commit -m "Wire click-to-move raycast and camera-follow"
```

---

### Task 5: Fishing spot and proximity trigger

**Files:**
- Create: `src/game/world/FishingSpot.tsx`
- Modify: `src/App.tsx` (add the spot to the scene, wire proximity check)

**Interfaces:**
- Consumes: `useFishingStore` (Task 2), player's `positionRef` (Task 3/4).
- Produces: `export function FishingSpot(props: { id: string; position: [number, number, number] }): JSX.Element`.
  Renders a visual marker and drives `useFishingStore`'s `nearSpotId` on
  ENTER/EXIT transitions only (spec Section 5's discrete-event rule).

- [ ] **Step 1: Write the FishingSpot component**

```tsx
// src/game/world/FishingSpot.tsx
import { useRef } from 'react'
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
  playerPositionRef: React.RefObject<THREE.Vector3>
}) {
  const wasNearRef = useRef(false)
  const spotPos = useRef(new THREE.Vector3(...position))

  useFrame(() => {
    const player = playerPositionRef.current
    if (!player) return
    const isNear = player.distanceTo(spotPos.current) < TRIGGER_RADIUS

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

The `wasNearRef !== isNear` guard is the ENTER/EXIT-only rule from spec
Section 5 — `setNearSpot` (a Zustand action, which triggers React
re-renders in anything subscribed to it) fires only on the transition, not
every frame.

- [ ] **Step 2: Add the spot to the scene**

Modify `Scene()` in `src/App.tsx` to include one fishing spot near the
dock:

```tsx
// src/App.tsx — inside Scene(), after <Water />
<FishingSpot id="dock" position={[6, 0.05, 2]} playerPositionRef={positionRef} />
```

(Add the import: `import { FishingSpot } from './game/world/FishingSpot'`.)

- [ ] **Step 3: Run the build gate**

Run: `npx tsc --noEmit && npm run build`
Expected: both exit 0.

- [ ] **Step 4: Manual verification**

Run `npm run dev`. Click near the yellow marker at `[6, 0.05, 2]` — walk
the player close to it. Add a temporary `console.log(useFishingStore.getState().nearSpotId)` inside `Scene`'s render (or check via React
devtools) to confirm it flips to `'dock'` on entry and back to `null` on
exit. Remove any temporary debug code before committing.

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
- Consumes: `useInventoryStore` (Task 2), `Fish` type (Task 1).
- Produces: `export function resolveCatch(fish: Fish): void` — called by
  Task 8's `FishingBar` on a Perfect/Good result. This is the one place
  cross-store effects happen (spec Section 4, hard rule 2). M1 has no
  quests yet, so this orchestrator only touches inventory — Task 3's spec
  design anticipates a `quest.onFishCaught()` call joining it in M3; do
  not add a placeholder for that now (YAGNI — add it when M3 needs it).

- [ ] **Step 1: Write the failing test**

```ts
// src/game/fishing/resolveCatch.test.ts
import { describe, it, expect, afterEach } from 'vitest'
import { resolveCatch } from './resolveCatch'
import { useInventoryStore } from '../../stores/useInventoryStore'
import { FISH } from '../../data/fish'

describe('resolveCatch', () => {
  afterEach(() => {
    useInventoryStore.getState().reset()
  })

  it('adds the caught fish to inventory', () => {
    resolveCatch(FISH[0])
    expect(useInventoryStore.getState().caughtFish).toContain(FISH[0])
  })

  it('can be called multiple times, accumulating catches', () => {
    resolveCatch(FISH[0])
    resolveCatch(FISH[1])
    expect(useInventoryStore.getState().caughtFish).toHaveLength(2)
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
import { useInventoryStore } from '../../stores/useInventoryStore'

export function resolveCatch(fish: Fish): void {
  useInventoryStore.getState().addFish(fish)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/game/fishing/resolveCatch.test.ts`
Expected: PASS, both assertions green.

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
  `export function scoreCast(pointerPosition: number, greenZoneStart: number, greenZoneEnd: number, perfectZoneStart: number, perfectZoneEnd: number): CatchResult`.
  Task 8 (`FishingBar.tsx`) consumes this to turn a bar position into a
  result without embedding the scoring math in a React component (keeps it
  unit-testable per spec Section 8).

- [ ] **Step 1: Write the failing test**

```ts
// src/game/fishing/scoring.test.ts
import { describe, it, expect } from 'vitest'
import { scoreCast } from './scoring'

describe('scoreCast', () => {
  it('returns perfect when pointer is inside the perfect zone', () => {
    expect(scoreCast(50, 30, 70, 45, 55)).toBe('perfect')
  })

  it('returns good when pointer is inside the green zone but outside perfect', () => {
    expect(scoreCast(35, 30, 70, 45, 55)).toBe('good')
  })

  it('returns miss when pointer is outside the green zone entirely', () => {
    expect(scoreCast(10, 30, 70, 45, 55)).toBe('miss')
  })

  it('treats zone boundaries as inclusive', () => {
    expect(scoreCast(30, 30, 70, 45, 55)).toBe('good')
    expect(scoreCast(45, 30, 70, 45, 55)).toBe('perfect')
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

export function scoreCast(
  pointerPosition: number,
  greenZoneStart: number,
  greenZoneEnd: number,
  perfectZoneStart: number,
  perfectZoneEnd: number
): CatchResult {
  if (pointerPosition >= perfectZoneStart && pointerPosition <= perfectZoneEnd) {
    return 'perfect'
  }
  if (pointerPosition >= greenZoneStart && pointerPosition <= greenZoneEnd) {
    return 'good'
  }
  return 'miss'
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/game/fishing/scoring.test.ts`
Expected: PASS, all 5 assertions green.

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
- Modify: `src/App.tsx` (render HUD/FishingBar as siblings of `<Canvas>`, wire the "Fish" prompt to `nearSpotId`)

**Interfaces:**
- Consumes: `useFishingStore` (Task 2), `getAvailableFish` (Task 1),
  `usePlayerStore` (Task 2, for `rodTier`), `scoreCast` (Task 7),
  `resolveCatch` (Task 6).
- Produces: `export function FishingBar(props: { spotId: string; timeOfDay: 'day' | 'night'; onClose: () => void }): JSX.Element`,
  `export function HUD(): JSX.Element`.

- [ ] **Step 1: Write the FishingBar component**

Per spec Section 6: pointer position updates via ref/rAF, `setState` only
on the Perfect/Good/Miss result (the discrete-event rule applies inside
this overlay too, not just at the 3D boundary).

```tsx
// src/ui/FishingBar.tsx
import { useEffect, useRef, useState } from 'react'
import { getAvailableFish } from '../data/fish'
import { usePlayerStore } from '../stores/usePlayerStore'
import { scoreCast, type CatchResult } from '../game/fishing/scoring'
import { resolveCatch } from '../game/fishing/resolveCatch'

const BAR_WIDTH = 300
const GREEN_ZONE = [100, 200] as const
const PERFECT_ZONE = [140, 160] as const
const SWEEP_SPEED = 200 // px per second

export function FishingBar({
  spotId,
  timeOfDay,
  onClose,
}: {
  spotId: string
  timeOfDay: 'day' | 'night'
  onClose: () => void
}) {
  const pointerRef = useRef<HTMLDivElement>(null)
  const positionRef = useRef(0)
  const directionRef = useRef(1)
  const [result, setResult] = useState<CatchResult | null>(null)
  const rodTier = usePlayerStore((s) => s.rodTier)

  useEffect(() => {
    if (result) return
    let frameId: number
    let last = performance.now()

    const tick = (now: number) => {
      const delta = (now - last) / 1000
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
  }, [result])

  const handleCast = () => {
    const score = scoreCast(positionRef.current, GREEN_ZONE[0], GREEN_ZONE[1], PERFECT_ZONE[0], PERFECT_ZONE[1])
    setResult(score)

    if (score !== 'miss') {
      const available = getAvailableFish(spotId, timeOfDay, rodTier)
      if (available.length > 0) {
        const caught = available[Math.floor(Math.random() * available.length)]
        resolveCatch(caught)
      }
    }
  }

  return (
    <div style={overlayStyle}>
      <div style={{ position: 'relative', width: BAR_WIDTH, height: 24, background: '#333' }}>
        <div style={{ position: 'absolute', left: GREEN_ZONE[0], width: GREEN_ZONE[1] - GREEN_ZONE[0], height: '100%', background: '#4a9d4a' }} />
        <div style={{ position: 'absolute', left: PERFECT_ZONE[0], width: PERFECT_ZONE[1] - PERFECT_ZONE[0], height: '100%', background: '#2f7d2f' }} />
        <div ref={pointerRef} style={{ position: 'absolute', top: -4, width: 4, height: 32, background: '#fff' }} />
      </div>
      {!result ? (
        <button onClick={handleCast} style={{ marginTop: 12 }}>Cast!</button>
      ) : (
        <>
          <p style={{ color: '#fff', marginTop: 12 }}>{result.toUpperCase()}!</p>
          <button onClick={onClose} style={{ marginTop: 4 }}>Close</button>
        </>
      )}
    </div>
  )
}

const overlayStyle: React.CSSProperties = {
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

Per spec Section 6: UI containers use `pointer-events: none` with
interactive children `auto`, so a HUD click never also triggers a
world click-to-move.

```tsx
// src/ui/HUD.tsx
import { useFishingStore } from '../stores/useFishingStore'
import { useInventoryStore } from '../stores/useInventoryStore'

export function HUD({ onFish }: { onFish: () => void }) {
  const nearSpotId = useFishingStore((s) => s.nearSpotId)
  const coins = useInventoryStore((s) => s.coins)
  const caughtCount = useInventoryStore((s) => s.caughtFish.length)

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', top: 16, left: 16, color: '#fff', pointerEvents: 'auto' }}>
        Coins: {coins} | Fish caught: {caughtCount}
      </div>
      {nearSpotId && (
        <button
          onClick={onFish}
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

```tsx
// src/App.tsx — add state and render HUD/FishingBar as siblings of <Canvas>
import { useState, useRef, useCallback } from 'react'
// ...existing imports...
import { HUD } from './ui/HUD'
import { FishingBar } from './ui/FishingBar'

export default function App() {
  const [webglOk] = useState(hasWebGL)
  const [fishing, setFishing] = useState<{ spotId: string } | null>(null)

  if (!webglOk) {
    return <WebGLFallback />
  }

  return (
    <>
      <Canvas shadows style={{ width: '100vw', height: '100vh' }}>
        <Scene />
      </Canvas>
      <HUD onFish={() => setFishing({ spotId: 'dock' })} />
      {fishing && (
        <FishingBar
          spotId={fishing.spotId}
          timeOfDay="day"
          onClose={() => setFishing(null)}
        />
      )}
    </>
  )
}
```

Note: `timeOfDay="day"` is hardcoded for M1 — the day/night cycle
(`useWorldStore`, quantized phase) is M3 scope. This is a deliberate,
temporary simplification, not a bug.

- [ ] **Step 4: Run the build gate**

Run: `npx tsc --noEmit && npm run build`
Expected: both exit 0.

- [ ] **Step 5: Manual verification**

Run `npm run dev`. Walk to the fishing spot, the "Fish" button appears.
Click it, the timing bar opens and sweeps. Click "Cast!" — confirm a
Perfect/Good/Miss result shows, and on a non-miss the HUD's "Fish caught"
counter increments after closing the bar.

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
  `saveGame()` + flush-on-visibilitychange/beforeunload)

**Interfaces:**
- Consumes: `usePlayerStore`, `useInventoryStore` (Task 2).
- Produces: `export function saveGame(): void`, `export function loadGame(): void`,
  `export const SAVE_KEY: string`, `export const SAVE_VERSION: number`.

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

import { saveGame, loadGame, SAVE_KEY } from './persistence'
import { useInventoryStore } from '../stores/useInventoryStore'
import { FISH } from '../data/fish'

describe('persistence', () => {
  beforeEach(() => {
    storage.clear()
    useInventoryStore.getState().reset()
  })

  it('round-trips inventory state through save and load', () => {
    useInventoryStore.getState().addFish(FISH[0])
    saveGame()
    useInventoryStore.getState().reset()
    expect(useInventoryStore.getState().caughtFish).toHaveLength(0)
    loadGame()
    expect(useInventoryStore.getState().caughtFish).toHaveLength(1)
    expect(useInventoryStore.getState().caughtFish[0].id).toBe(FISH[0].id)
  })

  it('backs up and discards on a corrupt save, starting fresh', () => {
    storage.set(SAVE_KEY, 'not valid json{{{')
    loadGame()
    expect(useInventoryStore.getState().caughtFish).toHaveLength(0)
    expect(storage.get(`${SAVE_KEY}-backup`)).toBe('not valid json{{{')
  })

  it('backs up and discards on an unknown save version', () => {
    storage.set(SAVE_KEY, JSON.stringify({ version: 999, data: {} }))
    loadGame()
    expect(useInventoryStore.getState().caughtFish).toHaveLength(0)
    expect(storage.get(`${SAVE_KEY}-backup`)).toBeDefined()
  })

  it('load with no existing save is a no-op, not an error', () => {
    expect(() => loadGame()).not.toThrow()
    expect(useInventoryStore.getState().caughtFish).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/persistence.test.ts`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/persistence.ts
import { usePlayerStore } from '../stores/usePlayerStore'
import { useInventoryStore } from '../stores/useInventoryStore'

export const SAVE_KEY = 'moonlit-lake-save'
export const SAVE_VERSION = 1

type SaveData = {
  player: { rodTier: number }
  inventory: { coins: number; caughtFish: ReturnType<typeof useInventoryStore.getState>['caughtFish'] }
}

export function saveGame(): void {
  try {
    const data: SaveData = {
      player: { rodTier: usePlayerStore.getState().rodTier },
      inventory: {
        coins: useInventoryStore.getState().coins,
        caughtFish: useInventoryStore.getState().caughtFish,
      },
    }
    localStorage.setItem(SAVE_KEY, JSON.stringify({ version: SAVE_VERSION, data }))
  } catch {
    // localStorage unavailable (private browsing, quota, disabled) — game
    // runs in-memory only for this session. Never throw.
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

  let parsed: { version: number; data: SaveData }
  try {
    parsed = JSON.parse(raw)
  } catch {
    backupAndDiscard(raw)
    return
  }

  if (parsed.version !== SAVE_VERSION) {
    backupAndDiscard(raw)
    return
  }

  usePlayerStore.setState({ rodTier: parsed.data.player.rodTier })
  useInventoryStore.setState({
    coins: parsed.data.inventory.coins,
    caughtFish: parsed.data.inventory.caughtFish,
  })
}

function backupAndDiscard(raw: string): void {
  try {
    localStorage.setItem(`${SAVE_KEY}-backup`, raw)
    localStorage.removeItem(SAVE_KEY)
  } catch {
    // best-effort — if this fails too, the corrupt entry is simply ignored
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/persistence.test.ts`
Expected: PASS, all 4 assertions green.

- [ ] **Step 5: Wire load-on-mount and debounced save into App.tsx**

```tsx
// src/App.tsx — add near the top of the App component
import { useEffect, useRef } from 'react'
import { saveGame, loadGame } from './lib/persistence'
import { useInventoryStore } from './stores/useInventoryStore'
import { usePlayerStore } from './stores/usePlayerStore'

// Inside the App component, before the early WebGL-fallback return:
useEffect(() => {
  loadGame()
}, [])

useEffect(() => {
  const debouncedSave = () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(saveGame, 1000)
  }
  const unsubInventory = useInventoryStore.subscribe(debouncedSave)
  const unsubPlayer = usePlayerStore.subscribe(debouncedSave)

  const flush = () => saveGame()
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush()
  })
  window.addEventListener('beforeunload', flush)

  return () => {
    unsubInventory()
    unsubPlayer()
    window.removeEventListener('beforeunload', flush)
  }
}, [])
```

Note: `saveTimeoutRef` needs a `useRef<ReturnType<typeof setTimeout>>(undefined)`
declared alongside the other App-level refs — add it in this same step.

- [ ] **Step 6: Run the build gate**

Run: `npx tsc --noEmit && npm run build`
Expected: both exit 0.

- [ ] **Step 7: Manual verification (this is M1's visible-progress checkpoint)**

Run `npm run dev`. Catch a fish (Perfect or Good result). Reload the page.
Expected: the HUD's "Fish caught" counter still shows the catch — the
save/load round-trip works in the actual browser, not just in the unit
test's localStorage shim.

- [ ] **Step 8: Commit**

```bash
git add src/lib/persistence.ts src/lib/persistence.test.ts src/App.tsx
git commit -m "Add save/load persistence with versioned envelope and flush-on-hide"
```

---

## Plan Self-Review

**Spec coverage:** M1's spec line ("One fishing spot, 3 fish species,
working minigame, save/load round-trip") is covered by Tasks 1
(fish data), 5 (spot), 7-8 (minigame), 9 (save/load). Player
movement/camera-follow (Tasks 3-4) aren't explicitly named in M1's
one-line spec description but are load-bearing prerequisites — you can't
reach a fishing spot without a player. Rod-tier gating exists in the data
model (Task 1) per the spec's decided mechanic, but no shop/upgrade UI is
built (correctly deferred to M2). Bait is correctly absent everywhere. Day/
night phase is correctly hardcoded to `'day'` for M1, not built out.

**Placeholder scan:** no TBDs. The one deliberate simplification
(`timeOfDay="day"` hardcoded) is explicitly called out as intentional, not
left silent.

**Type consistency:** `Fish` type (Task 1) is used identically in Task 2
(`useInventoryStore`), Task 6 (`resolveCatch`), and Task 8 (`FishingBar`).
`usePlayerController`'s `positionRef`/`setTarget` signature (Task 3) is
threaded consistently through Task 4's `IsoCamera`/`Player`/`FishingSpot`
props. `useFishingStore.nearSpotId` (Task 2) is written by Task 5's
`FishingSpot` and read by Task 8's `HUD` with matching types.
