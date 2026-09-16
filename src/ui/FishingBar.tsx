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

  // The pointer sweeps via ref + rAF; React state only changes on the cast result.
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
