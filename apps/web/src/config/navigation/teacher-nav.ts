import type { NavigationItem } from "./types"

export const teacherNavItems: NavigationItem[] = [
  {
    id: "teacher-dashboard",
    labelKey: "nav.teacher.dashboard",
    href: "/teacher/dashboard",
    icon: "layout-dashboard",
    matchPrefixes: ["/teacher", "/teacher/dashboard"],
  },
  {
    id: "teacher-students",
    labelKey: "nav.teacher.students",
    href: "/teacher/students",
    icon: "users",
  },
  {
    id: "teacher-attendance",
    labelKey: "nav.teacher.attendance",
    href: "/teacher/attendance",
    icon: "calendar-check",
  },
  {
    id: "teacher-assignments",
    labelKey: "nav.teacher.assignments",
    href: "/teacher/assignments",
    icon: "clipboard-check",
  },
  { id: "teacher-grades", labelKey: "nav.teacher.grades", href: "/teacher/grades", icon: "star" },
  {
    id: "teacher-exams",
    labelKey: "nav.teacher.exams",
    href: "/teacher/exams",
    icon: "file-pen-line",
  },
  {
    id: "teacher-schedule",
    labelKey: "nav.teacher.schedule",
    href: "/teacher/schedule",
    icon: "clock-3",
  },
  {
    id: "teacher-notices",
    labelKey: "nav.teacher.notices",
    href: "/teacher/notices",
    icon: "megaphone",
  },
  {
    id: "teacher-calendar",
    labelKey: "nav.teacher.calendar",
    href: "/teacher/calendar",
    icon: "calendar-days",
  },
  {
    id: "teacher-profile",
    labelKey: "nav.teacher.profile",
    href: "/teacher/profile",
    icon: "user",
  },
  {
    id: "teacher-settings",
    labelKey: "nav.teacher.settings",
    href: "/teacher/settings",
    icon: "settings",
  },
]
