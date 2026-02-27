export const PERMISSIONS = {
  TENANT_READ: "tenant:read",
  TENANT_WRITE: "tenant:write",
  USER_READ: "user:read",
  USER_WRITE: "user:write",
  TEACHER_READ: "teacher:read",
  TEACHER_WRITE: "teacher:write",
  STUDENT_READ: "student:read",
  STUDENT_WRITE: "student:write",
  PARENT_READ: "parent:read",
  PARENT_WRITE: "parent:write",
  CLASS_READ: "class:read",
  CLASS_WRITE: "class:write",
  ATTENDANCE_READ: "attendance:read",
  ATTENDANCE_WRITE: "attendance:write",
  GRADE_READ: "grade:read",
  GRADE_WRITE: "grade:write",
  EXAM_READ: "exam:read",
  EXAM_WRITE: "exam:write",
  ASSIGNMENT_READ: "assignment:read",
  ASSIGNMENT_WRITE: "assignment:write",
  FINANCE_READ: "finance:read",
  FINANCE_WRITE: "finance:write",
  NOTICE_READ: "notice:read",
  NOTICE_WRITE: "notice:write",
  NOTIFICATION_READ: "notification:read",
  NOTIFICATION_WRITE: "notification:write",
  AI_READ: "ai:read",
  AI_WRITE: "ai:write",
} as const

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

export const PERMISSION_VALUES = Object.freeze(Object.values(PERMISSIONS) as Permission[])
