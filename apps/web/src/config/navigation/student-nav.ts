import type { NavigationItem } from "./types"

export const studentNavItems: NavigationItem[] = [
  {
    id: "student-dashboard",
    labelKey: "nav.student.dashboard",
    href: "/student/dashboard",
    icon: "layout-dashboard",
    matchPrefixes: ["/student", "/student/dashboard"],
  },
  {
    id: "student-schedule",
    labelKey: "nav.student.schedule",
    href: "/student/schedule",
    icon: "clock-3",
  },
  {
    id: "student-assignments",
    labelKey: "nav.student.assignments",
    href: "/student/assignments",
    icon: "clipboard-list",
  },
  { id: "student-grades", labelKey: "nav.student.grades", href: "/student/grades", icon: "star" },
  { id: "student-exams", labelKey: "nav.student.exams", href: "/student/exams", icon: "file-text" },
  {
    id: "student-attendance",
    labelKey: "nav.student.attendance",
    href: "/student/attendance",
    icon: "calendar-check",
  },
  {
    id: "student-notices",
    labelKey: "nav.student.notices",
    href: "/student/notices",
    icon: "megaphone",
  },
  {
    id: "student-calendar",
    labelKey: "nav.student.calendar",
    href: "/student/calendar",
    icon: "calendar-days",
  },
  {
    id: "student-profile",
    labelKey: "nav.student.profile",
    href: "/student/profile",
    icon: "user",
  },
]
