import { useState, useCallback, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import type { Vector3 } from 'three'
import { Island } from './game/world/Island'
import { Water } from './game/world/Water'
import { FishingSpot } from './game/world/FishingSpot'
import { IsoCamera } from './game/camera/IsoCamera'
import { Player } from './game/player/Player'
import { usePlayerController } from './game/player/usePlayerController'
import { WebGLFallback } from './WebGLFallback'
import { HUD } from './ui/HUD'
import { FishingBar } from './ui/FishingBar'

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
      {/* Scene background (not CSS) so the reflective water mirrors it. */}
      <color attach="background" args={['#cfe8ee']} />
      <IsoCamera targetRef={positionRef} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 15, 5]} intensity={1.2} castShadow />
      <Island onClick={handleGroundClick} />
      <Water />
      <FishingSpot id="dock" position={[5, 1.05, 3]} playerPositionRef={positionRef} />
      <Player positionRef={positionRef} />
    </>
  )
}

export default function App() {
  const [webglOk] = useState(hasWebGL)
  const [fishingSpotId, setFishingSpotId] = useState<string | null>(null)

  if (!webglOk) {
    return <WebGLFallback />
  }

  // timeOfDay is hardcoded for M1; the day/night cycle is M3 scope.
  return (
    <>
      <Canvas shadows style={{ width: '100vw', height: '100vh' }}>
        <Suspense fallback={null}>
          <Scene movementLocked={fishingSpotId !== null} />
        </Suspense>
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
