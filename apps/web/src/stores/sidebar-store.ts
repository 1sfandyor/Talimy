import { create } from "zustand"

type SidebarStoreState = {
  isOpen: boolean
  isCollapsed: boolean
  activeItemId: string | null
  open: () => void
  close: () => void
  toggle: () => void
  setCollapsed: (value: boolean) => void
  setActiveItemId: (value: string | null) => void
}

export const useSidebarStore = create<SidebarStoreState>((set) => ({
  isOpen: false,
  isCollapsed: false,
  activeItemId: null,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
  setCollapsed: (value) => set({ isCollapsed: value }),
  setActiveItemId: (value) => set({ activeItemId: value }),
}))
