export type TimeOfDay = 'day' | 'night'

export type Fish = {
  id: string
  name: string
  spotId: string
  timeOfDay: TimeOfDay
  minRod: number
  weightRange: [number, number]
}

// M1 ships one spot ('dock') and daytime only. Night fish, two more spots
// and their species arrive in M3 with the day/night cycle. Golden Koi is
// rod-tier 2 so the rod gate is real data, even though no rod upgrade
// exists until M2.
export const FISH: Fish[] = [
  { id: 'carp', name: 'Carp', spotId: 'dock', timeOfDay: 'day', minRod: 1, weightRange: [1.2, 4.5] },
  { id: 'perch', name: 'Perch', spotId: 'dock', timeOfDay: 'day', minRod: 1, weightRange: [0.4, 1.5] },
  { id: 'golden-koi', name: 'Golden Koi', spotId: 'dock', timeOfDay: 'day', minRod: 2, weightRange: [0.8, 2.0] },
]

export function getFishById(id: string): Fish | undefined {
  return FISH.find((f) => f.id === id)
}

export function getAvailableFish(spotId: string, timeOfDay: TimeOfDay, rodTier: number): Fish[] {
  return FISH.filter(
    (f) => f.spotId === spotId && f.timeOfDay === timeOfDay && rodTier >= f.minRod
  )
}

// Rounded to 0.1 kg so saves and the future Collection Book show tidy
// numbers. `random` is injectable for deterministic tests.
export function rollWeight(fish: Fish, random: () => number = Math.random): number {
  const [min, max] = fish.weightRange
  const raw = min + random() * (max - min)
  return Math.round(raw * 10) / 10
}
