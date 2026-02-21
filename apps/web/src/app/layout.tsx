import "./globals.css"
import type { Metadata } from "next"
import type { ReactNode } from "react"

import { QueryProvider } from "@/providers/query-provider"

export const metadata: Metadata = {
  title: "Talimy",
  description: "Talimy School Management Platform",
}

type RootLayoutProps = {
  children: ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  )
}
