"use client"

import { useSidebarStore } from "@/stores/sidebar-store"

export function useSidebar() {
  const isOpen = useSidebarStore((state) => state.isOpen)
  const isCollapsed = useSidebarStore((state) => state.isCollapsed)
  const activeItemId = useSidebarStore((state) => state.activeItemId)
  const open = useSidebarStore((state) => state.open)
  const close = useSidebarStore((state) => state.close)
  const toggle = useSidebarStore((state) => state.toggle)
  const setCollapsed = useSidebarStore((state) => state.setCollapsed)
  const setActiveItemId = useSidebarStore((state) => state.setActiveItemId)

  return { isOpen, isCollapsed, activeItemId, open, close, toggle, setCollapsed, setActiveItemId }
}
