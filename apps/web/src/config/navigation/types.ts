export type NavigationBadge = {
  type: "dot" | "count" | "label"
  value?: string | number
}

export type NavigationItem = {
  id: string
  labelKey: string
  href: string
  icon: string
  matchPrefixes?: string[]
  disabled?: boolean
  badge?: NavigationBadge
}
