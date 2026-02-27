import type { NavigationItem } from "./types"

export const platformNavItems: NavigationItem[] = [
  {
    id: "platform-dashboard",
    labelKey: "nav.platform.dashboard",
    href: "/dashboard",
    icon: "layout-dashboard",
    matchPrefixes: ["/dashboard"],
  },
  {
    id: "platform-schools",
    labelKey: "nav.platform.schools",
    href: "/schools",
    icon: "building-2",
    matchPrefixes: ["/schools"],
  },
  {
    id: "platform-settings",
    labelKey: "nav.platform.settings",
    href: "/settings",
    icon: "settings",
    matchPrefixes: ["/settings"],
  },
]
