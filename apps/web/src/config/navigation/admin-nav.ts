import type { NavigationItem } from "./types"

export const adminNavItems: NavigationItem[] = [
  {
    id: "admin-dashboard",
    labelKey: "nav.admin.dashboard",
    href: "/admin/dashboard",
    icon: "layout-dashboard",
    matchPrefixes: ["/admin", "/admin/dashboard"],
  },
  {
    id: "admin-teachers",
    labelKey: "nav.admin.teachers",
    href: "/admin/teachers",
    icon: "graduation-cap",
  },
  { id: "admin-students", labelKey: "nav.admin.students", href: "/admin/students", icon: "users" },
  { id: "admin-classes", labelKey: "nav.admin.classes", href: "/admin/classes", icon: "school" },
  {
    id: "admin-attendance",
    labelKey: "nav.admin.attendance",
    href: "/admin/attendance",
    icon: "calendar-check",
  },
  { id: "admin-exams", labelKey: "nav.admin.exams", href: "/admin/exams", icon: "file-pen-line" },
  { id: "admin-finance", labelKey: "nav.admin.finance", href: "/admin/finance", icon: "wallet" },
  { id: "admin-notices", labelKey: "nav.admin.notices", href: "/admin/notices", icon: "megaphone" },
  {
    id: "admin-calendar",
    labelKey: "nav.admin.calendar",
    href: "/admin/calendar",
    icon: "calendar-days",
  },
  {
    id: "admin-settings",
    labelKey: "nav.admin.settings",
    href: "/admin/settings",
    icon: "settings",
  },
]
