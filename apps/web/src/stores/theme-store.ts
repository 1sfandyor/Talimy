import { create } from "zustand"

export type AppTheme = "light" | "dark" | "system"

type ThemeStoreState = {
  theme: AppTheme
  resolvedTheme: Exclude<AppTheme, "system">
  setTheme: (theme: AppTheme) => void
  setResolvedTheme: (theme: Exclude<AppTheme, "system">) => void
  toggleTheme: () => void
}

export const useThemeStore = create<ThemeStoreState>((set) => ({
  theme: "light",
  resolvedTheme: "light",
  setTheme: (theme) => set({ theme }),
  setResolvedTheme: (theme) => set({ resolvedTheme: theme }),
  toggleTheme: () =>
    set((state) => ({
      theme: state.theme === "system" ? "light" : state.theme === "light" ? "dark" : "light",
    })),
}))
