export const ROLES = {
  PLATFORM_ADMIN: "platform_admin",
  SCHOOL_ADMIN: "school_admin",
  TEACHER: "teacher",
  STUDENT: "student",
  PARENT: "parent",
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

export const ROLE_VALUES = Object.freeze(Object.values(ROLES) as Role[])
