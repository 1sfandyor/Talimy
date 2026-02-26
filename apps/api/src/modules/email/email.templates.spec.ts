/// <reference types="node" />
import { strict as assert } from "node:assert"
import { test } from "node:test"

import { EmailTemplatesService } from "./email.templates"

test("EmailTemplatesService renders notification template and interpolates variables", () => {
  const service = new EmailTemplatesService()
  const result = service.render(
    "notification",
    { title: "Hello", message: "World" },
    "Custom Subject"
  )

  assert.equal(result.subject, "Custom Subject")
  assert.match(result.html, /Hello/)
  assert.match(result.html, /World/)
  assert.match(result.text, /Hello/)
  assert.match(result.text, /World/)
})

test("EmailTemplatesService uses sensible default subject", () => {
  const service = new EmailTemplatesService()
  const result = service.render("welcome", { firstName: "Ali" })
  assert.match(result.subject, /Ali/)
})
