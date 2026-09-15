import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Island } from './game/world/Island'
import { Water } from './game/world/Water'
import { IsoCamera } from './game/camera/IsoCamera'
import { WebGLFallback } from './WebGLFallback'

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return !!(window.WebGL2RenderingContext && canvas.getContext('webgl2'))
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
