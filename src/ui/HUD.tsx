import { useFishingStore } from '../stores/useFishingStore'
import { useInventoryStore } from '../stores/useInventoryStore'

// Container swallows no pointer events; only the interactive children do,
// so a HUD click never doubles as a world click-to-move.
export function HUD({ onFish }: { onFish: (spotId: string) => void }) {
  const nearSpotId = useFishingStore((s) => s.nearSpotId)
  const coins = useInventoryStore((s) => s.coins)
  const caughtCount = useInventoryStore((s) => s.catches.length)

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', top: 16, left: 16, color: '#fff', pointerEvents: 'auto' }}>
        Coins: {coins} | Fish caught: {caughtCount}
      </div>
      {nearSpotId && (
        <button
          onClick={() => onFish(nearSpotId)}
          style={{ position: 'absolute', bottom: 40, right: 40, pointerEvents: 'auto' }}
        >
          Fish
        </button>
      )}
    </div>
  )
}
