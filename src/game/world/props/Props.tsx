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
          case 'dock':
            return <Dock key={key} x={p.x} z={p.z} rotation={p.rotation} />
          case 'lantern':
            return <Lantern key={key} x={p.x} z={p.z} />
          default:
            return null
        }
      })}
    </>
  )
}
