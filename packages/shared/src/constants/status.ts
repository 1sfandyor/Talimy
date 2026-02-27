export const TENANT_STATUSES = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  SUSPENDED: "suspended",
} as const

export const USER_STATUSES = {
  ACTIVE: "active",
  INACTIVE: "inactive",
} as const

export const TEACHER_STATUSES = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  ON_LEAVE: "on_leave",
} as const

export const STUDENT_STATUSES = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  GRADUATED: "graduated",
  TRANSFERRED: "transferred",
} as const

export type TenantStatus = (typeof TENANT_STATUSES)[keyof typeof TENANT_STATUSES]
export type UserStatus = (typeof USER_STATUSES)[keyof typeof USER_STATUSES]
export type TeacherStatus = (typeof TEACHER_STATUSES)[keyof typeof TEACHER_STATUSES]
export type StudentStatus = (typeof STUDENT_STATUSES)[keyof typeof STUDENT_STATUSES]
