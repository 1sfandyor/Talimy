#!/usr/bin/env node

/* eslint-disable no-console */

function getArg(name, fallback = "") {
  const prefix = `--${name}=`
  const hit = process.argv.find((arg) => arg.startsWith(prefix))
  return hit ? hit.slice(prefix.length) : fallback
}

function createCase(name) {
  return { name, ok: false, skipped: false, detail: "" }
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

function pretty(resp) {
  return {
    status: resp.status,
    body: resp.json ?? resp.text,
  }
}

function markOk(test, detail = "") {
  test.ok = true
  test.detail = detail
}

function markSkip(test, detail) {
  test.skipped = true
  test.detail = detail
}

function assertOrThrow(condition, message, extra) {
  if (!condition) {
    const error = new Error(message)
    error.extra = extra
    throw error
  }
}

async function main() {
  const baseUrl = getArg("base-url", process.env.API_BASE_URL || "https://api.talimy.space")
  const tenantId = getArg(
    "tenant-id",
    process.env.BRIDGE_TENANT_ID || "eddbf523-f288-402a-9a16-ef93d27aafc7"
  )
  const smokePassword = getArg("password", process.env.SMOKE_PASSWORD || "Password123")
  const platformEmail = getArg(
    "platform-email",
    process.env.PLATFORM_ADMIN_EMAIL || "admin@talimy.space"
  )
  const platformPassword = getArg("platform-password", process.env.PLATFORM_ADMIN_PASSWORD || "")

  const results = []
  const pushCase = (t) => {
    results.push(t)
    return t
  }

  console.log(`[smoke:integration] base=${baseUrl} tenant=${tenantId}`)

  let token = ""
  let createdNoticeId = ""

  // Health
  {
    const t = pushCase(createCase("health"))
    try {
      const resp = await httpJson(`${baseUrl}/api/health`)
      assertOrThrow(resp.status === 200, "Expected 200", pretty(resp))
      assertOrThrow(resp.json?.success === true, "Expected success envelope", pretty(resp))
      markOk(t, "GET /api/health -> 200")
    } catch (error) {
      t.detail = `${error.message} ${JSON.stringify(error.extra ?? {})}`
    }
  }

  // Auth register
  {
    const t = pushCase(createCase("auth-register"))
    try {
      const email = `integration-smoke+${Date.now()}@mezana.talimy.space`
      const resp = await httpJson(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: "Integration Smoke Admin",
          email,
          password: smokePassword,
          tenantId,
        }),
      })
      assertOrThrow(resp.status === 201, "Expected 201", pretty(resp))
      assertOrThrow(resp.json?.success === true, "Expected success envelope", pretty(resp))
      assertOrThrow(
        typeof resp.json?.data?.accessToken === "string",
        "Missing access token",
        pretty(resp)
      )
      token = resp.json.data.accessToken
      markOk(t, "POST /api/auth/register -> 201")
    } catch (error) {
      t.detail = `${error.message} ${JSON.stringify(error.extra ?? {})}`
    }
  }

  const authHeader = () => ({ Authorization: `Bearer ${token}` })

  // Exams list + getById
  {
    const t = pushCase(createCase("exams-list-get"))
    try {
      assertOrThrow(token, "Missing auth token from register")
      const listResp = await httpJson(
        `${baseUrl}/api/exams?tenantId=${encodeURIComponent(tenantId)}&page=1&limit=1`,
        { headers: authHeader() }
      )
      assertOrThrow(listResp.status === 200, "Exams list expected 200", pretty(listResp))
      const examId = listResp.json?.data?.data?.[0]?.id
      if (!examId) {
        markSkip(t, "No exam row available in tenant")
      } else {
        const getResp = await httpJson(
          `${baseUrl}/api/exams/${examId}?tenantId=${encodeURIComponent(tenantId)}`,
          { headers: authHeader() }
        )
        assertOrThrow(getResp.status === 200, "Exams getById expected 200", pretty(getResp))
        markOk(t, "GET /api/exams + /:id -> 200")
      }
    } catch (error) {
      t.detail = `${error.message} ${JSON.stringify(error.extra ?? {})}`
    }
  }

  // Notices CRUD
  {
    const t = pushCase(createCase("notices-crud"))
    try {
      assertOrThrow(token, "Missing auth token from register")
      const createResp = await httpJson(`${baseUrl}/api/notices`, {
        method: "POST",
        headers: { ...authHeader(), "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          title: "integration smoke notice",
          content: "integration smoke content",
          targetRole: "all",
          priority: "low",
        }),
      })
      assertOrThrow(createResp.status === 201, "Notices create expected 201", pretty(createResp))
      createdNoticeId = createResp.json?.data?.id || ""
      assertOrThrow(createdNoticeId, "Missing created notice id", pretty(createResp))

      const getResp = await httpJson(
        `${baseUrl}/api/notices/${createdNoticeId}?tenantId=${encodeURIComponent(tenantId)}`,
        { headers: authHeader() }
      )
      assertOrThrow(getResp.status === 200, "Notices getById expected 200", pretty(getResp))

      const patchResp = await httpJson(
        `${baseUrl}/api/notices/${createdNoticeId}?tenantId=${encodeURIComponent(tenantId)}`,
        {
          method: "PATCH",
          headers: { ...authHeader(), "Content-Type": "application/json" },
          body: JSON.stringify({ title: "integration smoke updated", priority: "high" }),
        }
      )
      assertOrThrow(patchResp.status === 200, "Notices update expected 200", pretty(patchResp))

      const deleteResp = await httpJson(
        `${baseUrl}/api/notices/${createdNoticeId}?tenantId=${encodeURIComponent(tenantId)}`,
        { method: "DELETE", headers: authHeader() }
      )
      assertOrThrow(deleteResp.status === 200, "Notices delete expected 200", pretty(deleteResp))

      markOk(t, "POST/GET/PATCH/DELETE /api/notices -> 201/200/200/200")
      createdNoticeId = ""
    } catch (error) {
      t.detail = `${error.message} ${JSON.stringify(error.extra ?? {})}`
    }
  }

  // Tenants platform-admin smoke (optional)
  {
    const t = pushCase(createCase("tenants-platform"))
    try {
      if (!platformPassword) {
        markSkip(t, "PLATFORM_ADMIN_PASSWORD not provided")
      } else {
        const loginResp = await httpJson(`${baseUrl}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: platformEmail, password: platformPassword }),
        })
        assertOrThrow(loginResp.status === 200, "Platform login expected 200", pretty(loginResp))
        const platformToken = loginResp.json?.data?.accessToken
        assertOrThrow(platformToken, "Missing platform token", pretty(loginResp))

        const tenantsResp = await httpJson(`${baseUrl}/api/tenants?page=1&limit=5`, {
          headers: { Authorization: `Bearer ${platformToken}` },
        })
        assertOrThrow(tenantsResp.status === 200, "Tenants list expected 200", pretty(tenantsResp))
        markOk(t, "POST /auth/login + GET /api/tenants -> 200")
      }
    } catch (error) {
      t.detail = `${error.message} ${JSON.stringify(error.extra ?? {})}`
    }
  }

  // Summary
  let failed = 0
  for (const r of results) {
    if (r.ok) {
      console.log(`[PASS] ${r.name}${r.detail ? ` | ${r.detail}` : ""}`)
      continue
    }
    if (r.skipped) {
      console.log(`[SKIP] ${r.name}${r.detail ? ` | ${r.detail}` : ""}`)
      continue
    }
    failed += 1
    console.log(`[FAIL] ${r.name}${r.detail ? ` | ${r.detail}` : ""}`)
  }

  if (failed > 0) {
    process.exitCode = 1
    return
  }
  console.log("[smoke:integration] PASS")
}

void main().catch((error) => {
  console.error("[smoke:integration] fatal", error)
  process.exit(1)
})
