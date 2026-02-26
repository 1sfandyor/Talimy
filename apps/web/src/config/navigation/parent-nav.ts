import type { NavigationItem } from "./types"

export const parentNavItems: NavigationItem[] = [
  {
    id: "parent-dashboard",
    labelKey: "nav.parent.dashboard",
    href: "/parent/dashboard",
    icon: "layout-dashboard",
    matchPrefixes: ["/parent", "/parent/dashboard"],
  },
  { id: "parent-profile", labelKey: "nav.parent.profile", href: "/parent/profile", icon: "user" },
]
