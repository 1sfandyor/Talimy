"use client"

import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes"
import type { ComponentProps, ReactNode } from "react"
import { useEffect } from "react"

import { useThemeStore, type AppTheme } from "@/stores/theme-store"

type AppThemeProviderProps = {
  children: ReactNode
}

const defaultThemeProps: ComponentProps<typeof NextThemesProvider> = {
  attribute: "class",
  defaultTheme: "light",
  enableSystem: false,
  disableTransitionOnChange: true,
}

export function ThemeProvider({ children }: AppThemeProviderProps) {
  return (
    <NextThemesProvider {...defaultThemeProps}>
      <ThemeStoreSync>{children}</ThemeStoreSync>
    </NextThemesProvider>
  )
}

type ThemeStoreSyncProps = {
  children: ReactNode
}

function ThemeStoreSync({ children }: ThemeStoreSyncProps) {
  const { theme, resolvedTheme } = useTheme()
  const setTheme = useThemeStore((state) => state.setTheme)
  const setResolvedTheme = useThemeStore((state) => state.setResolvedTheme)

  useEffect(() => {
    if (theme === "light" || theme === "dark" || theme === "system") {
      setTheme(theme as AppTheme)
    }

    if (resolvedTheme === "light" || resolvedTheme === "dark") {
      setResolvedTheme(resolvedTheme)
    }
  }, [resolvedTheme, setResolvedTheme, setTheme, theme])

  return <>{children}</>
}
