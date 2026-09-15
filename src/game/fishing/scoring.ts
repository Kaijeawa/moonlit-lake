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
