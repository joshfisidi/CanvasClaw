"use client"

import { create } from "zustand"
import type { BottomNavItemId } from "@/components/ui/bottom-nav/items"

export type PanelId = BottomNavItemId | null

export const usePanelStore = create<{
  active: PanelId
  isDirectControlOpen: boolean
  open: (id: Exclude<PanelId, null>) => void
  close: () => void
  setDirectControlOpen: (isOpen: boolean) => void
}>((set) => ({
  active: null,
  isDirectControlOpen: false,
  open: (id) => set({ active: id }),
  close: () => set({ active: null }),
  setDirectControlOpen: (isOpen) => set({ isDirectControlOpen: isOpen }),
}))
