/// <reference types="node" />
import { strict as assert } from "node:assert"
import { test } from "node:test"

import { SmsProcessor } from "../queue/processors/sms.processor"

test("SmsProcessor delegates plain body jobs to SmsService.send", async () => {
  let called = false
  const processor = new SmsProcessor({
    send: async () => {
      called = true
      return { provider: "twilio", accepted: 1, messageIds: ["sid"], skipped: false }
    },
    sendTemplate: async () => ({ provider: "twilio", accepted: 1, messageIds: [], skipped: false }),
  } as never)

  await processor.process({
    data: {
      tenantId: "11111111-1111-1111-1111-111111111111",
      to: ["+998901112233"],
      body: "Hello",
    },
  } as never)

  assert.equal(called, true)
})
