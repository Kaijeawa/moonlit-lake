import { create } from 'zustand'

type FishingState = {
  nearSpotId: string | null
  setNearSpot: (spotId: string | null) => void
  reset: () => void
}

const initialState = { nearSpotId: null as string | null }

export const useFishingStore = create<FishingState>((set) => ({
  ...initialState,
  setNearSpot: (spotId) => set({ nearSpotId: spotId }),
  reset: () => set(initialState),
}))
