import { create } from 'zustand'

export type CaughtFish = {
  fishId: string
  weight: number
  caughtAt: number
}

type InventoryState = {
  coins: number
  catches: CaughtFish[]
  addCatch: (record: CaughtFish) => void
  reset: () => void
}

const initialState = { coins: 0, catches: [] as CaughtFish[] }

export const useInventoryStore = create<InventoryState>((set) => ({
  ...initialState,
  addCatch: (record) => set((state) => ({ catches: [...state.catches, record] })),
  reset: () => set(initialState),
}))
