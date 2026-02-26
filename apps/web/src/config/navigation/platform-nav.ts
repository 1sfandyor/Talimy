import type { NavigationItem } from "./types"

export const platformNavItems: NavigationItem[] = [
  {
    id: "platform-dashboard",
    labelKey: "nav.platform.dashboard",
    href: "/platform/dashboard",
    icon: "layout-dashboard",
    matchPrefixes: ["/platform", "/platform/dashboard"],
  },
  {
    id: "platform-schools",
    labelKey: "nav.platform.schools",
    href: "/platform/schools",
    icon: "building-2",
    matchPrefixes: ["/platform/schools"],
  },
  {
    id: "platform-settings",
    labelKey: "nav.platform.settings",
    href: "/platform/settings",
    icon: "settings",
    matchPrefixes: ["/platform/settings"],
  },
]
