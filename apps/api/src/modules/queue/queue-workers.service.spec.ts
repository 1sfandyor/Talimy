import { afterEach, describe, expect, it } from "bun:test"

import { isQueueWorkersEnabled } from "./queue-workers.service"

const originalValue = process.env.QUEUE_WORKERS_ENABLED

afterEach(() => {
  if (typeof originalValue === "string") {
    process.env.QUEUE_WORKERS_ENABLED = originalValue
    return
  }

  delete process.env.QUEUE_WORKERS_ENABLED
})

describe("queue worker runtime toggle", () => {
  it("defaults to enabled when env is unset", () => {
    delete process.env.QUEUE_WORKERS_ENABLED
    expect(isQueueWorkersEnabled()).toBe(true)
  })

  it("disables workers for false-like values", () => {
    for (const value of ["false", "0", "off", "no"]) {
      process.env.QUEUE_WORKERS_ENABLED = value
      expect(isQueueWorkersEnabled()).toBe(false)
    }
  })

  it("keeps workers enabled for true-like values", () => {
    for (const value of ["true", "1", "yes"]) {
      process.env.QUEUE_WORKERS_ENABLED = value
      expect(isQueueWorkersEnabled()).toBe(true)
    }
  })
})
