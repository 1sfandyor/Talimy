/// <reference types="node" />
import { strict as assert } from "node:assert"
import { test } from "node:test"

import { SmsTemplatesService } from "./sms.templates"

test("SmsTemplatesService renders notification template", () => {
  const service = new SmsTemplatesService()
  const rendered = service.render("notification", { title: "T", message: "Hello" })
  assert.match(rendered.body, /T:/)
  assert.match(rendered.body, /Hello/)
})

test("SmsTemplatesService renders attendance and grade templates", () => {
  const service = new SmsTemplatesService()
  const attendance = service.render("attendance-alert", {
    studentName: "Ali",
    status: "absent",
    date: "2026-02-26",
  })
  const grade = service.render("grade-alert", {
    studentName: "Ali",
    score: 88,
    subject: "Math",
  })

  assert.match(attendance.body, /Attendance alert/)
  assert.match(grade.body, /Grade update/)
})
