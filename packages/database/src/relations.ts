import { relations } from "drizzle-orm"
import {
  academicYears,
  aiConversations,
  aiInsights,
  aiReports,
  assignmentSubmissions,
  assignments,
  attendance,
  attendanceSettings,
  auditLogs,
  classes,
  events,
  examResults,
  exams,
  feeStructures,
  gradeScales,
  grades,
  invoices,
  messages,
  notices,
  notifications,
  parentStudent,
  parents,
  paymentPlans,
  payments,
  permissions,
  roles,
  schedules,
  sections,
  sessions,
  students,
  subjects,
  teachers,
  tenants,
  terms,
  users,
} from "./schema"

export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(users),
  roles: many(roles),
  sessions: many(sessions),
  auditLogs: many(auditLogs),
  academicYears: many(academicYears),
  classes: many(classes),
  sections: many(sections),
  subjects: many(subjects),
  schedules: many(schedules),
  teachers: many(teachers),
  students: many(students),
  parents: many(parents),
  parentStudent: many(parentStudent),
  attendance: many(attendance),
  attendanceSettings: many(attendanceSettings),
  gradeScales: many(gradeScales),
  grades: many(grades),
  exams: many(exams),
  examResults: many(examResults),
  assignments: many(assignments),
  assignmentSubmissions: many(assignmentSubmissions),
  feeStructures: many(feeStructures),
  payments: many(payments),
  paymentPlans: many(paymentPlans),
  invoices: many(invoices),
  notices: many(notices),
  events: many(events),
  notifications: many(notifications),
  messages: many(messages),
  aiConversations: many(aiConversations),
  aiInsights: many(aiInsights),
  aiReports: many(aiReports),
}))

export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [users.tenantId],
    references: [tenants.id],
  }),
  teacher: many(teachers),
  student: many(students),
  parent: many(parents),
  sentMessages: many(messages, { relationName: "sentMessages" }),
  receivedMessages: many(messages, { relationName: "receivedMessages" }),
  notifications: many(notifications),
  sessions: many(sessions),
  auditLogs: many(auditLogs),
  notices: many(notices),
  aiConversations: many(aiConversations),
  aiReports: many(aiReports),
}))

export const rolesRelations = relations(roles, ({ one, many }) => ({
  tenant: one(tenants, { fields: [roles.tenantId], references: [tenants.id] }),
  permissions: many(permissions),
}))

export const permissionsRelations = relations(permissions, ({ one }) => ({
  role: one(roles, { fields: [permissions.roleId], references: [roles.id] }),
  tenant: one(tenants, { fields: [permissions.tenantId], references: [tenants.id] }),
}))

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
  tenant: one(tenants, { fields: [sessions.tenantId], references: [tenants.id] }),
}))

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, { fields: [auditLogs.userId], references: [users.id] }),
  tenant: one(tenants, { fields: [auditLogs.tenantId], references: [tenants.id] }),
}))

export const academicYearsRelations = relations(academicYears, ({ one, many }) => ({
  tenant: one(tenants, { fields: [academicYears.tenantId], references: [tenants.id] }),
  terms: many(terms),
  classes: many(classes),
}))

export const termsRelations = relations(terms, ({ one, many }) => ({
  tenant: one(tenants, { fields: [terms.tenantId], references: [tenants.id] }),
  academicYear: one(academicYears, {
    fields: [terms.academicYearId],
    references: [academicYears.id],
  }),
  grades: many(grades),
}))

export const classesRelations = relations(classes, ({ one, many }) => ({
  tenant: one(tenants, { fields: [classes.tenantId], references: [tenants.id] }),
  academicYear: one(academicYears, {
    fields: [classes.academicYearId],
    references: [academicYears.id],
  }),
  students: many(students),
  sections: many(sections),
  schedules: many(schedules),
  attendance: many(attendance),
  exams: many(exams),
  assignments: many(assignments),
  feeStructures: many(feeStructures),
}))

export const sectionsRelations = relations(sections, ({ one }) => ({
  tenant: one(tenants, { fields: [sections.tenantId], references: [tenants.id] }),
  class: one(classes, { fields: [sections.classId], references: [classes.id] }),
}))

export const subjectsRelations = relations(subjects, ({ one, many }) => ({
  tenant: one(tenants, { fields: [subjects.tenantId], references: [tenants.id] }),
  schedules: many(schedules),
  grades: many(grades),
  exams: many(exams),
  assignments: many(assignments),
}))

export const schedulesRelations = relations(schedules, ({ one }) => ({
  tenant: one(tenants, { fields: [schedules.tenantId], references: [tenants.id] }),
  class: one(classes, { fields: [schedules.classId], references: [classes.id] }),
  subject: one(subjects, { fields: [schedules.subjectId], references: [subjects.id] }),
}))

export const teachersRelations = relations(teachers, ({ one, many }) => ({
  tenant: one(tenants, { fields: [teachers.tenantId], references: [tenants.id] }),
  user: one(users, { fields: [teachers.userId], references: [users.id] }),
  assignments: many(assignments),
  grades: many(grades),
  attendance: many(attendance),
}))

export const studentsRelations = relations(students, ({ one, many }) => ({
  tenant: one(tenants, { fields: [students.tenantId], references: [tenants.id] }),
  user: one(users, { fields: [students.userId], references: [users.id] }),
  class: one(classes, { fields: [students.classId], references: [classes.id] }),
  parentLinks: many(parentStudent),
  attendance: many(attendance),
  grades: many(grades),
  examResults: many(examResults),
  assignmentSubmissions: many(assignmentSubmissions),
  payments: many(payments),
  paymentPlans: many(paymentPlans),
  invoices: many(invoices),
  aiInsights: many(aiInsights),
}))

export const parentsRelations = relations(parents, ({ one, many }) => ({
  tenant: one(tenants, { fields: [parents.tenantId], references: [tenants.id] }),
  user: one(users, { fields: [parents.userId], references: [users.id] }),
  studentLinks: many(parentStudent),
}))

export const parentStudentRelations = relations(parentStudent, ({ one }) => ({
  tenant: one(tenants, { fields: [parentStudent.tenantId], references: [tenants.id] }),
  parent: one(parents, { fields: [parentStudent.parentId], references: [parents.id] }),
  student: one(students, { fields: [parentStudent.studentId], references: [students.id] }),
}))

export const attendanceRelations = relations(attendance, ({ one }) => ({
  tenant: one(tenants, { fields: [attendance.tenantId], references: [tenants.id] }),
  student: one(students, { fields: [attendance.studentId], references: [students.id] }),
  class: one(classes, { fields: [attendance.classId], references: [classes.id] }),
  markedByTeacher: one(teachers, { fields: [attendance.markedBy], references: [teachers.id] }),
}))

export const attendanceSettingsRelations = relations(attendanceSettings, ({ one }) => ({
  tenant: one(tenants, { fields: [attendanceSettings.tenantId], references: [tenants.id] }),
}))

export const gradeScalesRelations = relations(gradeScales, ({ one }) => ({
  tenant: one(tenants, { fields: [gradeScales.tenantId], references: [tenants.id] }),
}))

export const gradesRelations = relations(grades, ({ one }) => ({
  tenant: one(tenants, { fields: [grades.tenantId], references: [tenants.id] }),
  student: one(students, { fields: [grades.studentId], references: [students.id] }),
  subject: one(subjects, { fields: [grades.subjectId], references: [subjects.id] }),
  term: one(terms, { fields: [grades.termId], references: [terms.id] }),
  teacher: one(teachers, { fields: [grades.teacherId], references: [teachers.id] }),
}))

export const examsRelations = relations(exams, ({ one, many }) => ({
  tenant: one(tenants, { fields: [exams.tenantId], references: [tenants.id] }),
  subject: one(subjects, { fields: [exams.subjectId], references: [subjects.id] }),
  class: one(classes, { fields: [exams.classId], references: [classes.id] }),
  results: many(examResults),
}))

export const examResultsRelations = relations(examResults, ({ one }) => ({
  tenant: one(tenants, { fields: [examResults.tenantId], references: [tenants.id] }),
  exam: one(exams, { fields: [examResults.examId], references: [exams.id] }),
  student: one(students, { fields: [examResults.studentId], references: [students.id] }),
}))

export const assignmentsRelations = relations(assignments, ({ one, many }) => ({
  tenant: one(tenants, { fields: [assignments.tenantId], references: [tenants.id] }),
  teacher: one(teachers, { fields: [assignments.teacherId], references: [teachers.id] }),
  subject: one(subjects, { fields: [assignments.subjectId], references: [subjects.id] }),
  class: one(classes, { fields: [assignments.classId], references: [classes.id] }),
  submissions: many(assignmentSubmissions),
}))

export const assignmentSubmissionsRelations = relations(assignmentSubmissions, ({ one }) => ({
  tenant: one(tenants, {
    fields: [assignmentSubmissions.tenantId],
    references: [tenants.id],
  }),
  assignment: one(assignments, {
    fields: [assignmentSubmissions.assignmentId],
    references: [assignments.id],
  }),
  student: one(students, {
    fields: [assignmentSubmissions.studentId],
    references: [students.id],
  }),
}))

export const feeStructuresRelations = relations(feeStructures, ({ one, many }) => ({
  tenant: one(tenants, { fields: [feeStructures.tenantId], references: [tenants.id] }),
  class: one(classes, { fields: [feeStructures.classId], references: [classes.id] }),
  paymentPlans: many(paymentPlans),
}))

export const paymentsRelations = relations(payments, ({ one }) => ({
  tenant: one(tenants, { fields: [payments.tenantId], references: [tenants.id] }),
  student: one(students, { fields: [payments.studentId], references: [students.id] }),
}))

export const paymentPlansRelations = relations(paymentPlans, ({ one }) => ({
  tenant: one(tenants, { fields: [paymentPlans.tenantId], references: [tenants.id] }),
  student: one(students, { fields: [paymentPlans.studentId], references: [students.id] }),
  feeStructure: one(feeStructures, {
    fields: [paymentPlans.feeStructureId],
    references: [feeStructures.id],
  }),
}))

export const invoicesRelations = relations(invoices, ({ one }) => ({
  tenant: one(tenants, { fields: [invoices.tenantId], references: [tenants.id] }),
  student: one(students, { fields: [invoices.studentId], references: [students.id] }),
}))

export const noticesRelations = relations(notices, ({ one }) => ({
  tenant: one(tenants, { fields: [notices.tenantId], references: [tenants.id] }),
  creator: one(users, { fields: [notices.createdBy], references: [users.id] }),
}))

export const eventsRelations = relations(events, ({ one }) => ({
  tenant: one(tenants, { fields: [events.tenantId], references: [tenants.id] }),
}))

export const notificationsRelations = relations(notifications, ({ one }) => ({
  tenant: one(tenants, { fields: [notifications.tenantId], references: [tenants.id] }),
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}))

export const messagesRelations = relations(messages, ({ one }) => ({
  tenant: one(tenants, { fields: [messages.tenantId], references: [tenants.id] }),
  sender: one(users, {
    relationName: "sentMessages",
    fields: [messages.senderId],
    references: [users.id],
  }),
  receiver: one(users, {
    relationName: "receivedMessages",
    fields: [messages.receiverId],
    references: [users.id],
  }),
}))

export const aiConversationsRelations = relations(aiConversations, ({ one }) => ({
  tenant: one(tenants, { fields: [aiConversations.tenantId], references: [tenants.id] }),
  user: one(users, { fields: [aiConversations.userId], references: [users.id] }),
}))

export const aiInsightsRelations = relations(aiInsights, ({ one }) => ({
  tenant: one(tenants, { fields: [aiInsights.tenantId], references: [tenants.id] }),
  student: one(students, { fields: [aiInsights.studentId], references: [students.id] }),
}))

export const aiReportsRelations = relations(aiReports, ({ one }) => ({
  tenant: one(tenants, { fields: [aiReports.tenantId], references: [tenants.id] }),
  generatedByUser: one(users, { fields: [aiReports.generatedBy], references: [users.id] }),
}))
