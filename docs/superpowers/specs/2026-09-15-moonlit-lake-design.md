# Moonlit Lake — Design Spec

**Date:** 2026-09-15
**Status:** Approved, pre-implementation

## 1. Goal

A cozy fishing web game (3D, browser, voxel/low-poly art style), inspired by
screenshots of an existing reference game ("Moonlit Lake Sanctuary"). Goal is
a real public launch with real users — not a portfolio piece, not a learning
exercise. No fixed deadline; ships when ready. Claude writes all code (100%
mode, matching the Sizzle/Play Store project's coding arrangement).

**Explicit trade-off accepted by the user:** starting this project pauses
DevOps Phase 1 (LMWN internship portfolio target, deadline Sept 2026) in
full. This was flagged and reconfirmed twice before work began.

## 2. Stack

- Vite + React 19 + TypeScript
- Three.js via `@react-three/fiber` (R3F) + `@react-three/drei`
- Zustand (state management)
- No backend for v1 — `localStorage` only
- Deploy target: Netlify (static, matches Vite output)

Pin exact R3F/drei/Three versions at implementation start (verify React 19
compatibility via context7 before scaffolding — do not assume last-known
versions are current).

**Why this stack over alternatives:** Babylon.js has no React wrapper as
mature as R3F, would require imperative scene management fighting React's
render model. Vanilla Three.js (no React) would require hand-written DOM
UI for the quest/shop/inventory panels this game needs — not worth it given
UI complexity. PlayCanvas's editor-based workflow conflicts with the
"Claude writes 100% of code" constraint. Engine choice (web/Three.js vs
Unity) was independently analyzed by the user from reference screenshots
before this spec — not re-litigated here.

## 3. Scope: v1 (Cozy Fishing MVP)

- 1 lake, 3 fishing spots
- 10–12 fish species, gated by: spot + time-of-day (day/night only, no
  weather in v1)
- 3 rod tiers (upgradeable via shop)
- 1 minigame: timing bar (red/green zone, tap in zone for Perfect/Good/Miss)
- Fish Collection Book (per-species: caught y/n, weight, spot, time caught)
- Shop: sell fish for coins, buy rod upgrades
- 5 quests
- Day/night cycle (continuous, ambient lighting only — no weather system)
- Desktop-first, click/tap-to-move input (mobile-compatible interaction
  model from day one; mobile performance tuning is a later milestone, not
  v1)
- ISO-style fixed camera only — no third-person, no zoom, no free rotation

### Explicitly out of v1 (scope fence)

- Weather system (rain, fog variation) — the reference screenshots show
  fog/rain-look visuals, but fish logic and lighting key off time-of-day
  only for v1
- Resource restoration system (carrot/wheat/wood gathering, visible in
  reference HUD) — v1 HUD shows coins only
- Camera zoom, camera rotation, third-person mode
- Sound/music — decide before launch, not part of initial milestones
- Multiplayer, online presence, ghost players, leaderboards
- Cloud save / accounts (Supabase or otherwise)
- Mobile performance optimization (LOD, draw-call budgets for low-end
  devices)

Anything in this list that seems necessary mid-build is a scope-creep
signal — flag it, don't silently add it.

## 4. Architecture

```
D:\moonlit-lake\
├── src/
│   ├── game/
│   │   ├── world/         (Island.tsx, Water.tsx, FishingSpot.tsx, Lighting.tsx)
│   │   ├── player/        (Player.tsx, usePlayerController hook)
│   │   ├── fishing/       (FishingBar.tsx, resolveCatch.ts)
│   │   ├── economy/       (sellFish.ts, buyRod.ts, claimQuestReward.ts)
│   │   └── camera/        (IsoCamera.tsx)
│   ├── ui/                 (QuestPanel, Inventory, CollectionBook, Shop, HUD — React, siblings of <Canvas>, not inside it)
│   ├── stores/              (usePlayerStore, useFishingStore, useInventoryStore, useWorldStore, useQuestStore — each gets reset() for test isolation)
│   ├── data/                 (fish.ts, rods.ts, quests.ts, island.ts, assets.ts)
│   └── lib/                  (persistence.ts)
```

### Hard rules

1. **`useFrame` + ref/`getState()` own all per-frame transient state**
   (position, velocity, cast progress, the time-of-day clock). React
   `useState`/props only drive UI panels reacting to discrete events
   (level-up, item pickup, zone enter/exit). Never write continuous
   values into Zustand every frame.
2. **Stores never call stores.** Cross-store effects go through an
   orchestrator function (`resolveCatch.ts`, `sellFish.ts`, `buyRod.ts`,
   `claimQuestReward.ts`) that calls each store's actions in sequence.
   Components call orchestrators; orchestrators are pure enough to
   unit-test without mounting React or Three.js.
3. **Terrain vs props are different asset sources.** Terrain is generated
   from a JSON grid (`data/island.ts`) as merged box geometry with vertex
   colors — one material, one draw call. GLB assets are for props/
   character/dock only, never terrain.
4. **Lighting reads the continuous clock, fish logic reads the quantized
   phase.** `Lighting.tsx` reads a time-of-day ref directly inside
   `useFrame` for smooth transitions. `useWorldStore` only receives
   discrete phase-transition events (day→dusk→night→dawn) — that's what
   `getAvailableFish()` reads. Never let fish-availability logic depend
   on the raw continuous clock, and never let lighting snap on phase
   boundaries.

## 5. Data Flow

```
Input (click/tap raycast, or WASD)
  → raycast filters hits to face.normal.y > 0.7 on a `walkable`-tagged layer
    (prevents clicking a cliff face and lerping through terrain)
  → usePlayerController (useFrame) moves player ref via straight-line lerp
    — no pathfinding, open terrain only, v1 scope
  → IsoCamera lerps to follow player ref (perspective camera, fixed ~50°
    elevation — matches reference screenshot foreshortening/reflections,
    not orthographic)
  → proximity check each frame: on ENTER/EXIT transition only (guarded,
    not every frame) writes a `nearSpot` flag to useFishingStore
  → player presses "Fish" → FishingBar opens (React overlay), pointer
    position updates via ref/rAF, setState fires only on Perfect/Good/Miss
    result
  → result → resolveCatch.ts orchestrates: inventory.addFish(),
    quest.onFishCaught(), world.onFishCaught() — in that order, stores
    never call each other directly
  → persistence.ts serializes player/inventory/quest/world stores (not
    fishing, which is transient) as { version: 1, data } to a single
    localStorage key, debounced AND flushed on visibilitychange/beforeunload
```

**Player position is not persisted.** On load, player always spawns at the
dock. This avoids the ref-vs-store position conflict entirely and is the
simplest correct choice for MVP.

**Save versioning:** load checks `data.version`. Mismatch or corrupt JSON →
back up the old value under `moonlit-lake-save-backup`, then discard and
start fresh. No migration layer for v1 — state this so nobody builds one
prematurely.

## 6. Components

See Section 4 file layout. Each component's contract is: what it reads
(a store selector or a ref), what it writes (an event call, never raw
continuous state), and what it explicitly does not know about (e.g.
`Player.tsx` has no knowledge of quests; `FishingBar.tsx` has no knowledge
of inventory internals — it returns a result to `resolveCatch.ts` and
nothing else).

`data/assets.ts` is a manifest: `id → { url, fallbackShape, scale }`. Every
GLB-loading component wraps in its own `<ErrorBoundary>` (not one boundary
around the whole scene — a single missing asset shouldn't blank the whole
island) paired with a `<Suspense>` loading state, falling back to the
`fallbackShape` (procedural box geometry) on load failure. This is required
because drei's `useGLTF` is Suspense-based and throws on failure — a
try/catch around it does not work.

Asset source for v1: one CC0 low-poly GLB pack (Kenney or Quaternius),
picked at implementation start. Character animation (idle/walk) is in v1
only if the chosen pack ships rigged models — decide when the pack is
picked, don't block the architecture on it.

UI containers use `pointer-events: none` with interactive children set to
`auto`, so clicking a UI button never also triggers a world click-to-move.

## 7. Error Handling

- **GLB load failure** → per-component ErrorBoundary → procedural
  placeholder from the asset manifest. Never a white screen.
- **localStorage unavailable** (private browsing, quota, disabled) →
  `persistence.ts` wraps all I/O in try/catch, game runs in-memory only
  for the session, shows a one-time non-blocking notice. Never throws.
- **Corrupt/unversioned save** → backup then discard (Section 5). Logged,
  not thrown.
- **Raycast miss** (click on sky/UI/off-island) → no-op.
- **Backgrounded tab during minigame** → clamp per-frame delta so a large
  time gap doesn't instantly skip the timing zone; resolves as Miss, not
  an exception.
- **Bad data reference** (quest points at a fish ID not in `fish.ts`) →
  guarded in orchestrators, logged and skipped, never crashes a session.
  Also caught earlier by the data-integrity test (Section 8).
- **WebGL unavailable** → static fallback message component instead of a
  blank canvas.

## 8. Testing

- **Vitest** for all logic: `getAvailableFish()`, orchestrator call order
  (`resolveCatch.ts`, `sellFish.ts`, etc.), save/load round-trip
  (including version-mismatch → backup → fresh-start path), minigame
  zone-hit scoring math. All engine-free.
- **Store tests** via Zustand's vanilla store API directly
  (`useInventoryStore.getState().addFish(x)` then assert) — no React
  needed. Every store implements `reset()` so tests don't leak state
  across each other.
- **Data-integrity test**: every fish/bait/rod ID referenced in
  `quests.ts`/`rods.ts` resolves in `fish.ts`. Moves a runtime guard
  (Section 7) into a test-time guarantee.
- **No automated visual/3D tests for v1** — disproportionate cost for a
  solo, no-deadline scope. Verification is manual per milestone: run dev
  server, walk the island, catch a fish, reload, confirm save persisted.
  This manual check doubles as the visible-progress checkpoint.
- **Manual perf check per milestone**: `renderer.info.render.calls` stays
  under ~100 for the island scene; 60fps target on the user's RTX 3050
  laptop at 1080p. Without this, "one draw call for terrain" is
  aspirational, not verified.
- **Build gate before every commit**: `tsc --noEmit` && `vite build`. With
  no visual test suite, this is the primary automated safety net.
- No E2E framework (Playwright etc.) for v1 — YAGNI until there's a
  second developer or CI need.

## 9. Milestones (visible-progress constraint, not just a plan)

Each milestone ends in something openable in a browser — never a
"stores + schema" checkpoint with nothing to look at.

- **M0**: Deployed Netlify URL. Walkable voxel island, water plane, ISO
  camera. No gameplay yet.
- **M1**: One fishing spot, 3 fish species, working minigame, save/load
  round-trip.
- **M2**: Collection Book, Shop, rod upgrades (all 3 tiers).
- **M3**: All 3 fishing spots, day/night cycle, 5 quests.
- **M4**: Polish pass, sound decision made and either implemented or
  explicitly deferred, launch.

Task-level breakdown for each milestone is writing-plans' job, not this
spec's.
