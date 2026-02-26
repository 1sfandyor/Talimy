import { create } from "zustand"

export type NotificationListItem = {
  id: string
  title: string
  message: string
  type: "info" | "success" | "warning" | "error"
  createdAt: string
  isRead: boolean
}

type NotificationStoreState = {
  items: NotificationListItem[]
  unreadCount: number
  setItems: (items: NotificationListItem[]) => void
  upsertItem: (item: NotificationListItem) => void
  setUnreadCount: (count: number) => void
  markRead: (id: string) => void
  clear: () => void
}

export const useNotificationStore = create<NotificationStoreState>((set) => ({
  items: [],
  unreadCount: 0,
  setItems: (items) =>
    set({
      items,
      unreadCount: items.filter((item) => !item.isRead).length,
    }),
  upsertItem: (item) =>
    set((state) => {
      const existingIndex = state.items.findIndex((entry) => entry.id === item.id)
      const nextItems =
        existingIndex >= 0
          ? state.items.map((entry) => (entry.id === item.id ? item : entry))
          : [item, ...state.items]
      return {
        items: nextItems,
        unreadCount: nextItems.filter((entry) => !entry.isRead).length,
      }
    }),
  setUnreadCount: (count) => set({ unreadCount: count }),
  markRead: (id) =>
    set((state) => {
      const nextItems = state.items.map((item) =>
        item.id === id ? { ...item, isRead: true } : item
      )
      return {
        items: nextItems,
        unreadCount: nextItems.filter((item) => !item.isRead).length,
      }
    }),
  clear: () => set({ items: [], unreadCount: 0 }),
}))
