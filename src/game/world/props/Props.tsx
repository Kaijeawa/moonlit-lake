// src/game/world/props/Props.tsx
import { PROPS } from '../../../data/props'
import { Dock } from './Dock'
import { Lantern } from './Lantern'
import { TreeRound } from './TreeRound'
import { TreePine } from './TreePine'
import { Bush } from './Bush'
import { LilyPad } from './LilyPad'
import { Reeds } from './Reeds'
import { Flower } from './Flower'

const SAKURA: [string, string, string] = ['#f2a7c9', '#f7bcd6', '#e88fc4']

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
          case 'treeRound':
            return <TreeRound key={key} x={p.x} z={p.z} scale={p.scale} rotation={p.rotation} />
          case 'treeSakura':
            return <TreeRound key={key} x={p.x} z={p.z} scale={p.scale} rotation={p.rotation} canopy={SAKURA} />
          case 'treePine':
            return <TreePine key={key} x={p.x} z={p.z} scale={p.scale} rotation={p.rotation} />
          case 'bush':
            return <Bush key={key} x={p.x} z={p.z} scale={p.scale} rotation={p.rotation} />
          case 'lilyPad':
            return <LilyPad key={key} x={p.x} z={p.z} scale={p.scale} flower={p.color === 'flower'} />
          case 'reeds':
            return <Reeds key={key} x={p.x} z={p.z} scale={p.scale} />
          case 'flower':
            return <Flower key={key} x={p.x} z={p.z} color={p.color} />
          default:
            return null
        }
      })}
    </>
  )
}
