import { strict as assert } from "node:assert"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"

const serviceFilePath = join(process.cwd(), "apps/api/src/modules/schedule/schedule.service.ts")
const controllerFilePath = join(process.cwd(), "apps/api/src/modules/schedule/schedule.controller.ts")
const serviceSource = readFileSync(serviceFilePath, "utf-8")
const controllerSource = readFileSync(controllerFilePath, "utf-8")

test("schedule service contains CRUD entry points", () => {
  assert.match(serviceSource, /async create\(/)
  assert.match(serviceSource, /async getById\(/)
  assert.match(serviceSource, /async update\(/)
  assert.match(serviceSource, /async delete\(/)
})

test("schedule service applies class teacher and day filters in list", () => {
  assert.match(serviceSource, /if \(query\.classId\) filters\.push\(eq\(schedules\.classId, query\.classId\)\)/)
  assert.match(serviceSource, /if \(query\.teacherId\) filters\.push\(eq\(schedules\.teacherId, query\.teacherId\)\)/)
  assert.match(serviceSource, /if \(query\.dayOfWeek\) filters\.push\(eq\(schedules\.dayOfWeek, query\.dayOfWeek\)\)/)
})

test("schedule service implements teacher and room conflict detection", () => {
  assert.match(serviceSource, /private async assertNoConflict\(/)
  assert.match(serviceSource, /Teacher schedule conflict detected for the selected time slot/)
  assert.match(serviceSource, /Room schedule conflict detected for the selected time slot/)
  assert.match(serviceSource, /lt\(schedules\.startTime, params\.endTime\)/)
  assert.match(serviceSource, /gt\(schedules\.endTime, params\.startTime\)/)
})

test("schedule controller wires CRUD routes and zod validators", () => {
  assert.match(controllerSource, /@Get\(\)/)
  assert.match(controllerSource, /@Get\(":id"\)/)
  assert.match(controllerSource, /@Post\(\)/)
  assert.match(controllerSource, /@Patch\(":id"\)/)
  assert.match(controllerSource, /@Delete\(":id"\)/)
  assert.match(controllerSource, /new ZodValidationPipe\(scheduleQuerySchema\)/)
  assert.match(controllerSource, /new ZodValidationPipe\(createScheduleSchema\)/)
  assert.match(controllerSource, /new ZodValidationPipe\(updateScheduleSchema\)/)
})
