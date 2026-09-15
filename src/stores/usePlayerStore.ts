import { create } from 'zustand'

type PlayerState = {
  rodTier: number
  reset: () => void
}

const initialState = { rodTier: 1 }

export const usePlayerStore = create<PlayerState>((set) => ({
  ...initialState,
  reset: () => set(initialState),
}))
