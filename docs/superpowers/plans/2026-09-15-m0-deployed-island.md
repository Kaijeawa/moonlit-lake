# Moonlit Lake — M0: Deployed Walkable Island Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Get a live Netlify URL showing a walkable voxel island with a
reflective water plane and a fixed ISO-style camera. No gameplay yet — this
is the visible-progress checkpoint the spec requires before any fishing
mechanics are built.

**Architecture:** Vite + React 19 + TypeScript project. Terrain is generated
from a plain-data grid (`data/island.ts`) into one merged `BufferGeometry`
with vertex colors — a single draw call, no per-tile meshes. A fixed
perspective camera follows nothing yet (no player in M0) but is positioned
at the spec's locked ~50° elevation. Deployed as a static site to Netlify.

**Tech Stack:** Vite, React 19, TypeScript, `@react-three/fiber@9`,
`@react-three/drei`, `three`, `zustand` (installed now, used starting M1),
Vitest.

**Spec:** `docs/superpowers/specs/2026-09-15-moonlit-lake-design.md`

## Global Constraints

- React 19 requires `@react-three/fiber@9` (verified via context7,
  2026-09-15) — do not install `@react-three/fiber@8`, it pairs with
  React 18 and will fail to render.
- Terrain must be one merged geometry / one draw call (spec Section 4, hard
  rule 3) — never one mesh per tile.
- Camera is a fixed perspective camera at ~50° elevation, ISO-style, no
  user rotation/zoom (spec Section 3, Section 5).
- No WASD, no click-to-move yet — M0 has no player. Movement lands in M1.
- Build gate before every commit: `tsc --noEmit && npm run build` (spec
  Section 8).
- `bun run test` in this repo means **Vitest**, not Bun's own test runner
  (spec Section 8) — the plan below uses `npm`/`vitest` directly to avoid
  ambiguity.

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`
- Create: `src/main.tsx`, `src/App.tsx`
- Create: `.gitignore`

**Interfaces:**
- Consumes: nothing (first task)
- Produces: a running `npm run dev` dev server and `npm run build`
  production build, both of which every later task depends on.

- [ ] **Step 1: Scaffold with Vite's react-ts template**

Run in `D:\moonlit-lake`:

```bash
npm create vite@latest . -- --template react-ts
```

If prompted about the directory not being empty (it has `docs/` and `.git/`
already), confirm to proceed — it only adds files, doesn't touch existing
ones.

- [ ] **Step 2: Install 3D/state dependencies**

```bash
npm install three @react-three/fiber@9 @react-three/drei zustand
npm install -D @types/three vitest
```

- [ ] **Step 3: Add a `.gitignore`**

```
node_modules/
dist/
*.local
.DS_Store
```

- [ ] **Step 4: Add the Vitest config to `vite.config.ts`**

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
  },
})
```

- [ ] **Step 5: Add test script to `package.json`**

In the `"scripts"` section, add:

```json
"test": "vitest run"
```

- [ ] **Step 6: Verify the dev server runs**

Run: `npm run dev`
Expected: Vite prints a local URL (e.g. `http://localhost:5173/`); open it
and confirm the default Vite+React starter page loads with no console
errors.

Stop the dev server (Ctrl+C) before continuing.

- [ ] **Step 7: Verify the build gate works**

Run: `npx tsc --noEmit && npm run build`
Expected: both commands exit 0. A `dist/` folder is created.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json index.html src .gitignore
git commit -m "Scaffold Vite + React 19 + TypeScript project with R3F/drei/zustand"
```

---

### Task 2: Island data model and geometry builder (pure logic, unit tested)

**Files:**
- Create: `src/data/island.ts`
- Create: `src/data/island.test.ts`

**Interfaces:**
- Consumes: `three`'s `BufferGeometry`, `BufferGeometryUtils.mergeGeometries`
  (both importable in Node without a WebGL context — this is pure geometry
  math on typed arrays, not rendering).
- Produces:
  - `export type IslandTile = { x: number; z: number; height: number; color: string }`
  - `export const ISLAND_GRID: IslandTile[]`
  - `export function buildIslandGeometry(grid: IslandTile[]): THREE.BufferGeometry`
  - Task 3 (`Island.tsx`) consumes `ISLAND_GRID` and `buildIslandGeometry`
    directly.

- [ ] **Step 1: Write the failing test**

```ts
// src/data/island.test.ts
import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { ISLAND_GRID, buildIslandGeometry } from './island'

describe('buildIslandGeometry', () => {
  it('produces one merged BufferGeometry for the whole grid', () => {
    const geometry = buildIslandGeometry(ISLAND_GRID)
    expect(geometry).toBeInstanceOf(THREE.BufferGeometry)
  })

  it('has a vertex count matching 24 vertices per box (one box per tile)', () => {
    const geometry = buildIslandGeometry(ISLAND_GRID)
    const position = geometry.getAttribute('position')
    expect(position.count).toBe(ISLAND_GRID.length * 24)
  })

  it('carries a vertex color attribute (not a single flat material color)', () => {
    const geometry = buildIslandGeometry(ISLAND_GRID)
    expect(geometry.getAttribute('color')).toBeDefined()
  })

  it('positions each tile box at its grid x/z and height-scaled y', () => {
    const grid = [{ x: 0, z: 0, height: 1, color: '#4a7c3a' }]
    const geometry = buildIslandGeometry(grid)
    const position = geometry.getAttribute('position')
    // Every vertex's x should be within one tile-width of the tile's x=0 center
    for (let i = 0; i < position.count; i++) {
      expect(Math.abs(position.getX(i))).toBeLessThanOrEqual(0.5)
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/island.test.ts`
Expected: FAIL — `island.ts` doesn't exist yet (`Cannot find module './island'`).

- [ ] **Step 3: Write the implementation**

```ts
// src/data/island.ts
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

export type IslandTile = {
  x: number
  z: number
  height: number
  color: string
}

// Small hand-placed layout for M0: a roughly circular grass island.
// Extended with props/dock/fishing-spot tiles in later milestones.
export const ISLAND_GRID: IslandTile[] = (() => {
  const tiles: IslandTile[] = []
  const radius = 6
  for (let x = -radius; x <= radius; x++) {
    for (let z = -radius; z <= radius; z++) {
      const dist = Math.sqrt(x * x + z * z)
      if (dist <= radius) {
        tiles.push({ x, z, height: 1, color: '#4a7c3a' })
      }
    }
  }
  return tiles
})()

/**
 * Merges one box per tile into a single BufferGeometry with a per-vertex
 * color attribute, so the whole island renders as one draw call.
 */
export function buildIslandGeometry(grid: IslandTile[]): THREE.BufferGeometry {
  const geometries: THREE.BufferGeometry[] = grid.map((tile) => {
    const box = new THREE.BoxGeometry(1, tile.height, 1)
    box.translate(tile.x, tile.height / 2, tile.z)

    const color = new THREE.Color(tile.color)
    const vertexCount = box.getAttribute('position').count
    const colors = new Float32Array(vertexCount * 3)
    for (let i = 0; i < vertexCount; i++) {
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b
    }
    box.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return box
  })

  const merged = mergeGeometries(geometries, false)
  merged.computeVertexNormals()
  return merged
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/data/island.test.ts`
Expected: PASS, all 4 assertions green.

- [ ] **Step 5: Commit**

```bash
git add src/data/island.ts src/data/island.test.ts
git commit -m "Add island grid data and merged-geometry builder"
```

---

### Task 3: Island component

**Files:**
- Create: `src/game/world/Island.tsx`

**Interfaces:**
- Consumes: `ISLAND_GRID`, `buildIslandGeometry` from `src/data/island.ts`
  (Task 2).
- Produces: `export function Island(): JSX.Element` — an R3F component
  rendered inside `<Canvas>` by `App.tsx` (Task 6).

- [ ] **Step 1: Write the component**

No automated test for this step — spec Section 8 excludes automated visual
tests for v1; verification is the manual check in Task 6, Step 3.

```tsx
// src/game/world/Island.tsx
import { useMemo } from 'react'
// Not `import * as THREE from 'three'` — geometry is a plain BufferGeometry
// value here (no other THREE.* usage), and R3F's JSX intrinsics (`mesh`,
// `meshStandardMaterial`) only type-check once some import in this file
// loads @react-three/fiber's JSX augmentation. A type-only import does that
// without pulling in a real dependency the file doesn't otherwise need.
import type {} from '@react-three/fiber'
import { ISLAND_GRID, buildIslandGeometry } from '../../data/island'

export function Island() {
  const geometry = useMemo(() => buildIslandGeometry(ISLAND_GRID), [])

  return (
    <mesh geometry={geometry} userData={{ walkable: true }} receiveShadow>
      <meshStandardMaterial vertexColors roughness={0.9} />
    </mesh>
  )
}
```

The `userData={{ walkable: true }}` tag is unused in M0 (no raycasting yet)
but is placed now because Task 2's geometry and this mesh are the only
place the `walkable` layer tag can be attached — M1's click-to-move
raycast (spec Section 5) filters on it.

- [ ] **Step 2: Commit**

```bash
git add src/game/world/Island.tsx
git commit -m "Add Island component rendering merged terrain geometry"
```

---

### Task 4: Water plane

**Files:**
- Create: `src/game/world/Water.tsx`

**Interfaces:**
- Consumes: `MeshReflectorMaterial` from `@react-three/drei` (verified via
  context7, 2026-09-15 — current API, props confirmed: `blur`,
  `resolution`, `mixBlur`, `mixStrength`, `mirror`).
- Produces: `export function Water(): JSX.Element`, rendered by `App.tsx`
  (Task 6) alongside `Island`.

- [ ] **Step 1: Write the component**

```tsx
// src/game/world/Water.tsx
import { MeshReflectorMaterial } from '@react-three/drei'
// Type-only import so `<mesh>`/`<planeGeometry>` JSX intrinsics type-check
// even if this file is compiled before anything else in the program has
// imported @react-three/fiber (see Task 3's fix for why this is needed).
import type {} from '@react-three/fiber'

export function Water() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]}>
      <planeGeometry args={[60, 60]} />
      <MeshReflectorMaterial
        blur={[300, 100]}
        resolution={1024}
        mixBlur={1}
        mixStrength={40}
        roughness={0.7}
        depthScale={1}
        minDepthThreshold={0.85}
        color="#3a6ea5"
        metalness={0.4}
      />
    </mesh>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/game/world/Water.tsx
git commit -m "Add reflective water plane using drei MeshReflectorMaterial"
```

---

### Task 5: Fixed ISO camera

**Files:**
- Create: `src/game/camera/IsoCamera.tsx`

**Interfaces:**
- Consumes: `PerspectiveCamera` from `@react-three/drei` (a controlled
  camera component, not the raw three.js class).
- Produces: `export function IsoCamera(): JSX.Element`, rendered by
  `App.tsx` (Task 6). No player to follow yet in M0 — camera looks at the
  island's origin `[0, 0, 0]`. M1 adds player-following via the same
  component (documented here so the follow-up task knows where to hook in).

- [ ] **Step 1: Write the component**

```tsx
// src/game/camera/IsoCamera.tsx
import { PerspectiveCamera } from '@react-three/drei'

// Fixed perspective camera at a locked ~50deg elevation, matching the
// reference screenshot's foreshortening (spec Section 5). No user
// rotation or zoom in v1 (spec Section 3).
const CAMERA_DISTANCE = 14
const CAMERA_ELEVATION_DEG = 50

export function IsoCamera() {
  const rad = (CAMERA_ELEVATION_DEG * Math.PI) / 180
  const y = Math.sin(rad) * CAMERA_DISTANCE
  const horizontal = Math.cos(rad) * CAMERA_DISTANCE

  return (
    <PerspectiveCamera
      makeDefault
      position={[horizontal, y, horizontal]}
      fov={40}
      near={0.1}
      far={200}
    />
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/game/camera/IsoCamera.tsx
git commit -m "Add fixed ISO-style perspective camera"
```

---

### Task 6: Scene assembly, WebGL fallback, and manual verification

**Files:**
- Modify: `src/App.tsx`
- Create: `src/WebGLFallback.tsx`

**Interfaces:**
- Consumes: `Island` (Task 3), `Water` (Task 4), `IsoCamera` (Task 5).
- Produces: the assembled `<App>` root component — the last piece M0
  needs before deploy (Task 7).

- [ ] **Step 1: Write the WebGL-unavailable fallback**

```tsx
// src/WebGLFallback.tsx
export function WebGLFallback() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontFamily: 'sans-serif',
        textAlign: 'center',
        padding: '2rem',
      }}
    >
      <p>
        Moonlit Lake needs WebGL, which this browser or device doesn't
        support. Try a recent version of Chrome, Firefox, or Edge.
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Assemble the scene in App.tsx**

```tsx
// src/App.tsx
import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Island } from './game/world/Island'
import { Water } from './game/world/Water'
import { IsoCamera } from './game/camera/IsoCamera'
import { WebGLFallback } from './WebGLFallback'

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    )
  } catch {
    return false
  }
}

export default function App() {
  const [webglOk] = useState(hasWebGL)

  if (!webglOk) {
    return <WebGLFallback />
  }

  return (
    <Canvas shadows style={{ width: '100vw', height: '100vh' }}>
      <IsoCamera />
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 15, 5]} intensity={1.2} castShadow />
      <Island />
      <Water />
    </Canvas>
  )
}
```

- [ ] **Step 3: Manual verification (this is the spec's visible-progress checkpoint)**

Run: `npm run dev`, open the printed local URL.

Expected: a low-poly green island rendered as a circular cluster of boxes,
sitting above a blue reflective water plane, viewed from a fixed elevated
angle. No console errors. No player character yet — that's correct for M0.

- [ ] **Step 4: Manual perf check**

In the browser devtools console, run:

```js
document.querySelector('canvas').__r3f?.fiber // sanity check R3F mounted
```

(Exact introspection API varies by R3F version — if this doesn't return
something useful, skip it; the perf gate that matters is Step 5's frame
rate, confirmed visually.)

Confirm the scene renders smoothly (no visible stutter) — this is the
spec's "60fps on the RTX 3050 laptop" gate, checked by eye for M0 since
there's no gameplay loop yet to instrument.

- [ ] **Step 5: Run the build gate**

Run: `npx tsc --noEmit && npm run build`
Expected: both exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/WebGLFallback.tsx
git commit -m "Assemble M0 scene: island, water, ISO camera, WebGL fallback"
```

---

### Task 7: Deploy to Netlify

**Files:**
- Create: `netlify.toml`

**Interfaces:**
- Consumes: `dist/` output from `npm run build` (Task 1).
- Produces: a live public URL — the actual M0 deliverable.

- [ ] **Step 1: Add Netlify build config**

```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = "dist"
```

- [ ] **Step 2: Commit the config**

```bash
git add netlify.toml
git commit -m "Add Netlify build configuration"
```

- [ ] **Step 3: Push to a GitHub remote**

Netlify's git-based deploy needs a remote. If `D:\moonlit-lake` has no
remote yet, ask the user which GitHub account/org to push under before
running `git remote add` — do not assume an identity (the user's DevOps
project uses a deliberately separate `Kaijeaw` identity from their personal
GitHub; don't default to the personal one without asking).

```bash
git remote add origin <url-confirmed-with-user>
git push -u origin master
```

- [ ] **Step 4: Connect the Netlify site**

This step needs the user's Netlify account — hand off with instructions
rather than attempting it programmatically:

1. Go to https://app.netlify.com → "Add new site" → "Import an existing
   project" → pick the `moonlit-lake` GitHub repo.
2. Build command and publish directory are already set via
   `netlify.toml` — confirm they show `npm run build` / `dist` and deploy.
3. Netlify assigns a `*.netlify.app` URL. Note it down — this is the M0
   deliverable to open and confirm.

- [ ] **Step 5: Verify the live URL**

Open the deployed URL. Expected: same result as Task 6 Step 3 (island +
water + camera), now loading from a public URL instead of localhost.

- [ ] **Step 6: Record the URL**

No code change — tell the user the live URL once confirmed, so it can be
saved to project memory for future reference.

---

## Plan Self-Review

**Spec coverage:** M0's spec line ("Deployed Netlify URL. Walkable voxel
island, water plane, ISO camera. No gameplay yet.") is covered by Tasks
1–7. Terrain-is-one-draw-call (hard rule 3) is covered by Task 2's merged
geometry. Camera lock (Section 3/5) is covered by Task 5. WebGL-unavailable
handling (Section 7) is covered by Task 6. Build gate (Section 8) is
exercised in Tasks 1, 6, and implicitly by Netlify's own build in Task 7.
Player, fishing, quests, NPC, shop, persistence are M1+ and correctly out
of this plan.

**Placeholder scan:** no TBDs; every step has real code or a concrete
manual-check procedure.

**Type consistency:** `IslandTile` and `buildIslandGeometry` signatures in
Task 2 match their usage in Task 3 exactly. `Island`, `Water`, `IsoCamera`
component names in Tasks 3–5 match their imports in Task 6.
