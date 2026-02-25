#!/usr/bin/env node

/* eslint-disable no-console */

function getArg(name, fallback = "") {
  const prefix = `--${name}=`
  const hit = process.argv.find((arg) => arg.startsWith(prefix))
  return hit ? hit.slice(prefix.length) : fallback
}

function fail(message, extra) {
  console.error(`[smoke:error-contract] FAIL: ${message}`)
  if (extra !== undefined) {
    console.error(typeof extra === "string" ? extra : JSON.stringify(extra, null, 2))
  }
  process.exit(1)
}

async function httpJson(url, init = {}) {
  const res = await fetch(url, init)
  const text = await res.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = null
  }
  return { status: res.status, text, json }
}

function assert(condition, message, extra) {
  if (!condition) fail(message, extra)
}

function assertSuccessEnvelope(resp, expectedStatus) {
  assert(resp.status === expectedStatus, `Expected HTTP ${expectedStatus}`, resp)
  assert(resp.json && resp.json.success === true, "Expected success=true envelope", resp)
}

function assertErrorEnvelope(resp, expectedStatus, expectedCode) {
  assert(resp.status === expectedStatus, `Expected HTTP ${expectedStatus}`, resp)
  assert(resp.json && resp.json.success === false, "Expected success=false envelope", resp)
  assert(
    resp.json.error && typeof resp.json.error.message === "string",
    "Missing error.message",
    resp
  )
  if (expectedCode) {
    assert(resp.json.error.code === expectedCode, `Expected error.code=${expectedCode}`, resp)
  }
}

async function main() {
  const baseUrl = getArg("base-url", process.env.API_BASE_URL || "https://api.talimy.space")
  const tenantId = getArg(
    "tenant-id",
    process.env.BRIDGE_TENANT_ID || "eddbf523-f288-402a-9a16-ef93d27aafc7"
  )
  const password = getArg("password", process.env.SMOKE_PASSWORD || "Password123")
  const email = `contract-smoke+${Date.now()}@mezana.talimy.space`

  console.log(`[smoke:error-contract] base=${baseUrl} tenant=${tenantId}`)

  const health = await httpJson(`${baseUrl}/api/health`)
  assertSuccessEnvelope(health, 200)
  console.log("[smoke:error-contract] health ok")

  const register = await httpJson(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName: "Contract Smoke Admin",
      email,
      password,
      tenantId,
    }),
  })
  assertSuccessEnvelope(register, 201)
  const token = register.json?.data?.accessToken
  assert(
    typeof token === "string" && token.length > 20,
    "Missing access token from register",
    register
  )
  console.log("[smoke:error-contract] auth register ok")

  const authHeaders = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  }

  // Validation contract (UUID route param)
  const badExamId = await httpJson(
    `${baseUrl}/api/exams/not-a-uuid?tenantId=${encodeURIComponent(tenantId)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  assertErrorEnvelope(badExamId, 400, "VALIDATION_ERROR")
  console.log("[smoke:error-contract] exams invalid uuid -> VALIDATION_ERROR ok")

  // Validation contract (body schema)
  const badNotice = await httpJson(`${baseUrl}/api/notices`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      tenantId,
      title: "x",
      content: "y",
      targetRole: "bad",
      priority: "low",
    }),
  })
  assertErrorEnvelope(badNotice, 400, "VALIDATION_ERROR")
  console.log("[smoke:error-contract] notices invalid body -> VALIDATION_ERROR ok")

  // Not-found contract (well-formed UUID)
  const randomId = "11111111-1111-4111-8111-111111111111"
  const missingNotice = await httpJson(
    `${baseUrl}/api/notices/${randomId}?tenantId=${encodeURIComponent(tenantId)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  assertErrorEnvelope(missingNotice, 404, "NOT_FOUND")
  console.log("[smoke:error-contract] notices missing id -> NOT_FOUND ok")

  console.log("[smoke:error-contract] PASS")
}

main().catch((error) => {
  fail(
    "Unhandled script error",
    error instanceof Error ? error.stack || error.message : String(error)
  )
})
