import type { Fish } from '../../data/fish'
import { useInventoryStore, type CaughtFish } from '../../stores/useInventoryStore'

// The one place cross-store effects happen on a catch. Stores never call
// each other; anything that has to react to a catch (M3 quests, etc.) is
// wired here rather than inside useInventoryStore.
export function resolveCatch(fish: Fish, weight: number, now: () => number = Date.now): CaughtFish {
  const record: CaughtFish = { fishId: fish.id, weight, caughtAt: now() }
  useInventoryStore.getState().addCatch(record)
  return record
}
