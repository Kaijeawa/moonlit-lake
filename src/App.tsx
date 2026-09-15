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
