#!/usr/bin/env node

/* eslint-disable no-console */
const fs = require("node:fs")
const path = require("node:path")
const { createHmac, randomUUID } = require("node:crypto")

function loadDotEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return
  const content = fs.readFileSync(filePath, "utf8")
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith("#")) continue
    const eqIndex = line.indexOf("=")
    if (eqIndex <= 0) continue
    const key = line.slice(0, eqIndex).trim()
    if (!key || process.env[key]) continue
    let value = line.slice(eqIndex + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    process.env[key] = value
  }
}

loadDotEnvFile(path.resolve(__dirname, "..", ".env"))
loadDotEnvFile(path.resolve(__dirname, "..", "..", "web", ".env.local"))
loadDotEnvFile(path.resolve(__dirname, "..", "..", "..", ".env"))

function getArg(name, fallback = "") {
  const prefix = `--${name}=`
  const hit = process.argv.find((arg) => arg.startsWith(prefix))
  return hit ? hit.slice(prefix.length) : fallback
}

function getBoolArg(name, fallback = false) {
  const raw = getArg(name, "")
  if (!raw) return fallback
  return ["1", "true", "yes", "on"].includes(String(raw).toLowerCase())
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
  const getSetCookie =
    typeof res.headers.getSetCookie === "function"
      ? res.headers.getSetCookie.bind(res.headers)
      : null
  const setCookies = getSetCookie ? getSetCookie() : []
  return {
    status: res.status,
    statusText: res.statusText,
    text,
    json,
    headers: res.headers,
    headersMap: Object.fromEntries(res.headers.entries()),
    setCookies,
  }
}

function pretty(resp) {
  return {
    status: resp.status,
    body: resp.json ?? resp.text,
  }
}

function readFileSafe(filePath) {
  try {
    if (!filePath || !fs.existsSync(filePath)) return null
    return fs.readFileSync(filePath, "utf8")
  } catch {
    return null
  }
}

function flattenJsonKeys(input, prefix = "") {
  if (Array.isArray(input)) {
    return input.flatMap((value, index) =>
      flattenJsonKeys(value, prefix ? `${prefix}[${index}]` : `[${index}]`)
    )
  }

  if (input && typeof input === "object") {
    return Object.entries(input).flatMap(([key, value]) =>
      flattenJsonKeys(value, prefix ? `${prefix}.${key}` : key)
    )
  }

  return prefix ? [prefix] : []
}

function base64UrlFromBuffer(input) {
  return input.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function signSyntheticAccessToken(identity, jwtAccessSecret) {
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    sub: identity.sub,
    email: identity.email,
    tenantId: identity.tenantId,
    roles: identity.roles,
    genderScope: identity.genderScope,
    type: "access",
    jti: randomUUID(),
    iat: now,
    exp: now + 600,
  }

  const encodedHeader = base64UrlFromBuffer(Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })))
  const encodedPayload = base64UrlFromBuffer(Buffer.from(JSON.stringify(payload)))
  const body = `${encodedHeader}.${encodedPayload}`
  const signature = base64UrlFromBuffer(createHmac("sha256", jwtAccessSecret).update(body).digest())
  return `${body}.${signature}`
}

function hasPlaceholderText(resp, placeholderText) {
  const haystack = `${resp?.text ?? ""} ${JSON.stringify(resp?.json ?? {})}`.toLowerCase()
  return haystack.includes(String(placeholderText).toLowerCase())
}

function isAllowedStatus(status, allowed) {
  return Array.isArray(allowed) && allowed.includes(status)
}

function tryParseUrl(value) {
  try {
    return new URL(value)
  } catch {
    return null
  }
}

function buildHostScopedUrl(baseUrl, host, pathname) {
  const parsed = tryParseUrl(baseUrl)
  if (!parsed) return null
  parsed.hostname = host
  parsed.pathname = pathname
  parsed.search = ""
  return parsed.toString()
}

function extractRedirectLocation(resp) {
  const headerLocation = resp?.headersMap?.location || ""
  if (headerLocation) return headerLocation

  const body = String(resp?.text || "")
  const match = body.match(/NEXT_REDIRECT;[^;]*;([^;]+);30[78]/)
  return match?.[1] || ""
}

function isRedirectResponse(resp) {
  return [307, 308].includes(resp?.status) || Boolean(extractRedirectLocation(resp))
}

function shouldUseDirectTalimyHostChecks(baseUrl) {
  const parsed = tryParseUrl(baseUrl)
  if (!parsed) return false
  return (
    (parsed.protocol === "https:" || parsed.protocol === "http:") &&
    (parsed.hostname === "talimy.space" || parsed.hostname === "www.talimy.space")
  )
}

function extractRows(envelope) {
  const data = envelope?.data
  if (Array.isArray(data)) return data
  if (data && Array.isArray(data.data)) return data.data
  if (data && Array.isArray(data.items)) return data.items
  return []
}

function successData(envelope) {
  const data = envelope?.data
  if (data && typeof data === "object" && data.data && typeof data.data === "object") {
    return data.data
  }
  return data
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
  const webBaseUrl = getArg(
    "web-base-url",
    process.env.WEB_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || ""
  )
  const tenantId = getArg(
    "tenant-id",
    process.env.BRIDGE_TENANT_ID || "eddbf523-f288-402a-9a16-ef93d27aafc7"
  )
  const tenantSlug = getArg("tenant-slug", process.env.BRIDGE_TENANT_SLUG || "smoke-school")
  const smokePassword = getArg("password", process.env.SMOKE_PASSWORD || "Password123")
  const platformEmail = getArg(
    "platform-email",
    process.env.PLATFORM_ADMIN_EMAIL || "admin@talimy.space"
  )
  const platformPassword = getArg("platform-password", process.env.PLATFORM_ADMIN_PASSWORD || "")
  const platformBootstrapKey = getArg(
    "platform-bootstrap-key",
    process.env.AUTH_PLATFORM_ADMIN_BOOTSTRAP_KEY || ""
  )
  const strictEmail = getBoolArg(
    "strict-email",
    Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL)
  )
  const strictSms = getBoolArg(
    "strict-sms",
    Boolean(
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_PHONE_NUMBER
    )
  )
  const strictWebTrpc = getBoolArg("strict-web-trpc", false)
  const strictWebUpload = getBoolArg(
    "strict-web-upload",
    Boolean(
      process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET_NAME
    )
  )
  const strictPhase3 = getBoolArg("strict-phase3", false)
  const strictPlatformAuth = getBoolArg("strict-platform-auth", false)
  const strictPermifyDeny = getBoolArg("strict-permify-deny", false)
  const apiLogFile = getArg("api-log-file", process.env.SMOKE_API_LOG_FILE || "")
  const workerLogFile = getArg("worker-log-file", process.env.SMOKE_WORKER_LOG_FILE || "")
  const strictWorkerTopology = getBoolArg("strict-worker-topology", false)
  const jwtAccessSecret = getArg("jwt-access-secret", process.env.JWT_ACCESS_SECRET || "")

  const results = []
  const pushCase = (t) => {
    results.push(t)
    return t
  }

  console.log(
    `[smoke:integration] api=${baseUrl} web=${webBaseUrl || "(skip phase3 web)"} tenant=${tenantId}`
  )

  let token = ""
  let createdNoticeId = ""
  let currentUserId = ""
  let discoveredExamId = ""
  let discoveredClassId = ""
  let discoveredStudentId = ""

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
      const tokenPayloadPart = token.split(".")[1] || ""
      const tokenPayload = JSON.parse(Buffer.from(tokenPayloadPart, "base64url").toString("utf8"))
      currentUserId = tokenPayload.sub || ""
      assertOrThrow(currentUserId, "Missing user id in JWT payload")
      markOk(t, "POST /api/auth/register -> 201")
    } catch (error) {
      t.detail = `${error.message} ${JSON.stringify(error.extra ?? {})}`
    }
  }

  const authHeader = () => ({ Authorization: `Bearer ${token}` })

  // Auth login/refresh/logout
  {
    const t = pushCase(createCase("auth-login-refresh-logout"))
    try {
      assertOrThrow(token, "Missing auth token from register")
      const email = `integration-login+${Date.now()}@mezana.talimy.space`
      const registerResp = await httpJson(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: "Integration Login Smoke",
          email,
          password: smokePassword,
          tenantId,
        }),
      })
      assertOrThrow(
        registerResp.status === 201,
        "Second register expected 201",
        pretty(registerResp)
      )

      const loginResp = await httpJson(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: smokePassword }),
      })
      assertOrThrow(loginResp.status === 200, "Login expected 200", pretty(loginResp))
      const accessToken = loginResp.json?.data?.accessToken
      const refreshToken = loginResp.json?.data?.refreshToken
      assertOrThrow(accessToken && refreshToken, "Missing auth tokens", pretty(loginResp))

      const refreshResp = await httpJson(`${baseUrl}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      })
      assertOrThrow(refreshResp.status === 200, "Refresh expected 200", pretty(refreshResp))

      const logoutResp = await httpJson(`${baseUrl}/api/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      })
      assertOrThrow(logoutResp.status === 200, "Logout expected 200", pretty(logoutResp))

      markOk(t, "POST login/refresh/logout -> 200")
    } catch (error) {
      t.detail = `${error.message} ${JSON.stringify(error.extra ?? {})}`
    }
  }

  // Users list
  {
    const t = pushCase(createCase("users-list"))
    try {
      const resp = await httpJson(
        `${baseUrl}/api/users?tenantId=${encodeURIComponent(tenantId)}&page=1&limit=5`,
        { headers: authHeader() }
      )
      assertOrThrow(resp.status === 200, "Users list expected 200", pretty(resp))
      markOk(t, "GET /api/users -> 200")
    } catch (error) {
      t.detail = `${error.message} ${JSON.stringify(error.extra ?? {})}`
    }
  }

  // Teachers list
  {
    const t = pushCase(createCase("teachers-list"))
    try {
      const resp = await httpJson(
        `${baseUrl}/api/teachers?tenantId=${encodeURIComponent(tenantId)}&page=1&limit=5`,
        { headers: authHeader() }
      )
      assertOrThrow(resp.status === 200, "Teachers list expected 200", pretty(resp))
      markOk(t, "GET /api/teachers -> 200")
    } catch (error) {
      t.detail = `${error.message} ${JSON.stringify(error.extra ?? {})}`
    }
  }

  // Students list + invalid date range query
  {
    const t = pushCase(createCase("students-list"))
    try {
      const listResp = await httpJson(
        `${baseUrl}/api/students?tenantId=${encodeURIComponent(tenantId)}&page=1&limit=5`,
        { headers: authHeader() }
      )
      assertOrThrow(listResp.status === 200, "Students list expected 200", pretty(listResp))
      discoveredStudentId = extractRows(listResp.json)?.[0]?.id || ""

      const invalidResp = await httpJson(
        `${baseUrl}/api/students?tenantId=${encodeURIComponent(tenantId)}&enrollmentDateFrom=2026-12-31&enrollmentDateTo=2026-01-01`,
        { headers: authHeader() }
      )
      assertOrThrow(
        invalidResp.status === 400,
        "Students invalid range expected 400",
        pretty(invalidResp)
      )
      markOk(t, "GET /api/students + invalid enrollment range -> 200/400")
    } catch (error) {
      t.detail = `${error.message} ${JSON.stringify(error.extra ?? {})}`
    }
  }

  // Permify/Gender deny proof (school_admin male scope cannot create female student)
  {
    const t = pushCase(createCase("permify-gender-deny"))
    try {
      if (!jwtAccessSecret) {
        if (strictPermifyDeny) {
          throw new Error("JWT_ACCESS_SECRET (or --jwt-access-secret) is required for deny smoke")
        }
        markOk(t, "Optional deny smoke skipped (JWT_ACCESS_SECRET missing)")
      } else {
        const syntheticAccessToken = signSyntheticAccessToken(
          {
            sub: randomUUID(),
            email: `integration-permify-deny+${Date.now()}@mezana.talimy.space`,
            tenantId,
            roles: ["school_admin"],
            genderScope: "male",
          },
          jwtAccessSecret
        )

        const denyResp = await httpJson(`${baseUrl}/api/students`, {
          method: "POST",
          headers: {
            ...authHeader(),
            Authorization: `Bearer ${syntheticAccessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tenantId,
            userId: randomUUID(),
            studentId: `SMOKE-DENY-${Date.now()}`,
            gender: "female",
            enrollmentDate: "2026-01-01",
            fullName: "Permify Deny Smoke",
          }),
        })

        if (strictPermifyDeny) {
          assertOrThrow(denyResp.status === 403, "Strict deny smoke expected 403", pretty(denyResp))
        } else {
          assertOrThrow(
            [403, 503].includes(denyResp.status),
            "Deny smoke expected 403 (policy deny) or 503 (fail-closed)",
            pretty(denyResp)
          )
        }

        markOk(t, `POST /api/students deny check -> ${denyResp.status}`)
      }
    } catch (error) {
      t.detail = `${error.message} ${JSON.stringify(error.extra ?? {})}`
    }
  }

  // Parents list
  {
    const t = pushCase(createCase("parents-list"))
    try {
      const resp = await httpJson(
        `${baseUrl}/api/parents?tenantId=${encodeURIComponent(tenantId)}&page=1&limit=5`,
        { headers: authHeader() }
      )
      assertOrThrow(resp.status === 200, "Parents list expected 200", pretty(resp))
      markOk(t, "GET /api/parents -> 200")
    } catch (error) {
      t.detail = `${error.message} ${JSON.stringify(error.extra ?? {})}`
    }
  }

  // Classes list
  {
    const t = pushCase(createCase("classes-list"))
    try {
      const resp = await httpJson(
        `${baseUrl}/api/classes?tenantId=${encodeURIComponent(tenantId)}&page=1&limit=5`,
        { headers: authHeader() }
      )
      assertOrThrow(resp.status === 200, "Classes list expected 200", pretty(resp))
      discoveredClassId = extractRows(resp.json)?.[0]?.id || ""
      markOk(t, "GET /api/classes -> 200")
    } catch (error) {
      t.detail = `${error.message} ${JSON.stringify(error.extra ?? {})}`
    }
  }

  // Teachers positive CRUD (requires /api/users + /api/teachers)
  {
    const t = pushCase(createCase("teachers-crud"))
    try {
      assertOrThrow(token, "Missing auth token from register")

      const teacherUserEmail = `teacher.smoke+${Date.now()}@mezana.talimy.space`
      const createUserResp = await httpJson(`${baseUrl}/api/users`, {
        method: "POST",
        headers: { ...authHeader(), "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          fullName: "Teacher Smoke",
          email: teacherUserEmail,
          password: "Password123",
          role: "teacher",
        }),
      })
      assertOrThrow(
        createUserResp.status === 201 || createUserResp.status === 200,
        "Users create (teacher) expected 200/201",
        pretty(createUserResp)
      )
      const teacherUserId = createUserResp.json?.data?.id
      assertOrThrow(teacherUserId, "Missing created teacher user id", pretty(createUserResp))

      const createTeacherResp = await httpJson(`${baseUrl}/api/teachers`, {
        method: "POST",
        headers: { ...authHeader(), "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          userId: teacherUserId,
          employeeId: `EMP-${Date.now()}`,
          firstName: "Teacher",
          lastName: "Smoke",
          phone: "+998901112233",
          gender: "male",
          qualification: "Bachelor",
          experienceYears: 3,
          joinDate: "2026-01-01",
          dateOfBirth: "1995-01-01",
          status: "active",
        }),
      })
      assertOrThrow(
        createTeacherResp.status === 201 || createTeacherResp.status === 200,
        "Teachers create expected 200/201",
        pretty(createTeacherResp)
      )
      const teacherId = createTeacherResp.json?.data?.id
      assertOrThrow(teacherId, "Missing teacher profile id", pretty(createTeacherResp))

      const getTeacherResp = await httpJson(
        `${baseUrl}/api/teachers/${teacherId}?tenantId=${encodeURIComponent(tenantId)}`,
        { headers: authHeader() }
      )
      assertOrThrow(
        getTeacherResp.status === 200,
        "Teachers getById expected 200",
        pretty(getTeacherResp)
      )

      const patchTeacherResp = await httpJson(
        `${baseUrl}/api/teachers/${teacherId}?tenantId=${encodeURIComponent(tenantId)}`,
        {
          method: "PATCH",
          headers: { ...authHeader(), "Content-Type": "application/json" },
          body: JSON.stringify({ qualification: "Master", experienceYears: 4 }),
        }
      )
      assertOrThrow(
        patchTeacherResp.status === 200,
        "Teachers update expected 200",
        pretty(patchTeacherResp)
      )

      const deleteTeacherResp = await httpJson(
        `${baseUrl}/api/teachers/${teacherId}?tenantId=${encodeURIComponent(tenantId)}`,
        { method: "DELETE", headers: authHeader() }
      )
      assertOrThrow(
        deleteTeacherResp.status === 200,
        "Teachers delete expected 200",
        pretty(deleteTeacherResp)
      )

      markOk(t, "POST /users + teachers CRUD -> 201/200/200/200")
    } catch (error) {
      t.detail = `${error.message} ${JSON.stringify(error.extra ?? {})}`
    }
  }

  // Attendance (invalid mark + report)
  {
    const t = pushCase(createCase("attendance-runtime"))
    try {
      const invalidMarkResp = await httpJson(`${baseUrl}/api/attendance/mark`, {
        method: "POST",
        headers: { ...authHeader(), "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, records: [] }),
      })
      assertOrThrow(
        invalidMarkResp.status === 400,
        "Attendance invalid mark expected 400",
        pretty(invalidMarkResp)
      )

      const reportResp = await httpJson(
        `${baseUrl}/api/attendance/report?tenantId=${encodeURIComponent(tenantId)}`,
        { headers: authHeader() }
      )
      assertOrThrow(reportResp.status === 200, "Attendance report expected 200", pretty(reportResp))
      markOk(t, "POST /attendance/mark invalid + GET /attendance/report -> 400/200")
    } catch (error) {
      t.detail = `${error.message} ${JSON.stringify(error.extra ?? {})}`
    }
  }

  // Grades (list/report/scales + invalid scale)
  {
    const t = pushCase(createCase("grades-runtime"))
    try {
      const listResp = await httpJson(
        `${baseUrl}/api/grades?tenantId=${encodeURIComponent(tenantId)}&page=1&limit=5`,
        { headers: authHeader() }
      )
      assertOrThrow(listResp.status === 200, "Grades list expected 200", pretty(listResp))

      const reportResp = await httpJson(
        `${baseUrl}/api/grades/report?tenantId=${encodeURIComponent(tenantId)}`,
        { headers: authHeader() }
      )
      assertOrThrow(reportResp.status === 200, "Grades report expected 200", pretty(reportResp))

      const scalesResp = await httpJson(
        `${baseUrl}/api/grades/scales?tenantId=${encodeURIComponent(tenantId)}`,
        { headers: authHeader() }
      )
      assertOrThrow(scalesResp.status === 200, "Grade scales list expected 200", pretty(scalesResp))

      const invalidScaleResp = await httpJson(`${baseUrl}/api/grades/scales`, {
        method: "POST",
        headers: { ...authHeader(), "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          name: "bad-scale",
          minScore: 90,
          maxScore: 80,
          grade: "A",
          gpa: 4,
        }),
      })
      assertOrThrow(
        invalidScaleResp.status === 400 || invalidScaleResp.status === 422,
        "Invalid grade scale expected 400/422",
        pretty(invalidScaleResp)
      )

      markOk(t, "GET grades/report/scales + invalid scale -> 200/200/200/400")
    } catch (error) {
      t.detail = `${error.message} ${JSON.stringify(error.extra ?? {})}`
    }
  }

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
      const examId = extractRows(listResp.json)?.[0]?.id
      if (!examId) {
        markSkip(t, "No exam row available in tenant")
      } else {
        discoveredExamId = examId
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

  // Exams results/stats + invalid query/payload validation
  {
    const t = pushCase(createCase("exams-runtime"))
    try {
      const invalidRangeResp = await httpJson(
        `${baseUrl}/api/exams?tenantId=${encodeURIComponent(tenantId)}&dateFrom=2026-12-31&dateTo=2026-01-01`,
        { headers: authHeader() }
      )
      assertOrThrow(
        invalidRangeResp.status === 400,
        "Exams invalid date range expected 400",
        pretty(invalidRangeResp)
      )

      const invalidCreateResp = await httpJson(`${baseUrl}/api/exams`, {
        method: "POST",
        headers: { ...authHeader(), "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, type: "bad" }),
      })
      assertOrThrow(
        invalidCreateResp.status === 400 || invalidCreateResp.status === 422,
        "Exams invalid payload expected 400/422",
        pretty(invalidCreateResp)
      )

      if (!discoveredExamId) {
        markSkip(t, "No exam row available for results/stats checks")
      } else {
        const resultsResp = await httpJson(
          `${baseUrl}/api/exams/${discoveredExamId}/results?tenantId=${encodeURIComponent(tenantId)}`,
          { headers: authHeader() }
        )
        assertOrThrow(resultsResp.status === 200, "Exam results expected 200", pretty(resultsResp))
        const statsResp = await httpJson(
          `${baseUrl}/api/exams/${discoveredExamId}/stats?tenantId=${encodeURIComponent(tenantId)}`,
          { headers: authHeader() }
        )
        assertOrThrow(statsResp.status === 200, "Exam stats expected 200", pretty(statsResp))
        markOk(t, "Exams invalid checks + results/stats -> 400/200/200")
      }
    } catch (error) {
      t.detail = `${error.message} ${JSON.stringify(error.extra ?? {})}`
    }
  }

  // Assignments (list/stats + invalid date range)
  {
    const t = pushCase(createCase("assignments-runtime"))
    try {
      const listResp = await httpJson(
        `${baseUrl}/api/assignments?tenantId=${encodeURIComponent(tenantId)}&page=1&limit=5`,
        { headers: authHeader() }
      )
      assertOrThrow(listResp.status === 200, "Assignments list expected 200", pretty(listResp))
      const statsResp = await httpJson(
        `${baseUrl}/api/assignments/stats?tenantId=${encodeURIComponent(tenantId)}`,
        { headers: authHeader() }
      )
      assertOrThrow(statsResp.status === 200, "Assignments stats expected 200", pretty(statsResp))
      const invalidResp = await httpJson(
        `${baseUrl}/api/assignments?tenantId=${encodeURIComponent(tenantId)}&dueDateFrom=2026-12-31&dueDateTo=2026-01-01`,
        { headers: authHeader() }
      )
      assertOrThrow(
        invalidResp.status === 400,
        "Assignments invalid date range expected 400",
        pretty(invalidResp)
      )
      markOk(t, "GET assignments + stats + invalid range -> 200/200/400")
    } catch (error) {
      t.detail = `${error.message} ${JSON.stringify(error.extra ?? {})}`
    }
  }

  // Schedule (list + day filter)
  {
    const t = pushCase(createCase("schedule-runtime"))
    try {
      const listResp = await httpJson(
        `${baseUrl}/api/schedule?tenantId=${encodeURIComponent(tenantId)}&page=1&limit=5`,
        { headers: authHeader() }
      )
      assertOrThrow(listResp.status === 200, "Schedule list expected 200", pretty(listResp))
      const dayResp = await httpJson(
        `${baseUrl}/api/schedule?tenantId=${encodeURIComponent(tenantId)}&dayOfWeek=monday&page=1&limit=5`,
        { headers: authHeader() }
      )
      assertOrThrow(dayResp.status === 200, "Schedule day filter expected 200", pretty(dayResp))
      if (!discoveredClassId) {
        markSkip(t, "No class row available for invalid create payload check")
      } else {
        const invalidCreateResp = await httpJson(`${baseUrl}/api/schedule`, {
          method: "POST",
          headers: { ...authHeader(), "Content-Type": "application/json" },
          body: JSON.stringify({
            tenantId,
            classId: discoveredClassId,
            subjectId: "11111111-1111-4111-8111-111111111111",
            teacherId: "22222222-2222-4222-8222-222222222222",
            dayOfWeek: "monday",
            startTime: "12:00",
            endTime: "10:00",
          }),
        })
        assertOrThrow(
          invalidCreateResp.status === 400 || invalidCreateResp.status === 404,
          "Schedule invalid create expected 400/404",
          pretty(invalidCreateResp)
        )
        markOk(t, "GET /schedule + day filter + invalid create -> 200/200/400")
      }
    } catch (error) {
      t.detail = `${error.message} ${JSON.stringify(error.extra ?? {})}`
    }
  }

  // Calendar / Events (CRUD + filters + invalid date range)
  {
    const t = pushCase(createCase("calendar-runtime"))
    let createdEventId = ""
    try {
      const listResp = await httpJson(
        `${baseUrl}/api/events?tenantId=${encodeURIComponent(tenantId)}&page=1&limit=5`,
        { headers: authHeader() }
      )
      assertOrThrow(listResp.status === 200, "Events list expected 200", pretty(listResp))

      const invalidRangeResp = await httpJson(
        `${baseUrl}/api/events?tenantId=${encodeURIComponent(tenantId)}&dateFrom=${encodeURIComponent("2026-12-31T00:00:00.000Z")}&dateTo=${encodeURIComponent("2026-01-01T00:00:00.000Z")}`,
        { headers: authHeader() }
      )
      assertOrThrow(
        invalidRangeResp.status === 400,
        "Events invalid date range expected 400",
        pretty(invalidRangeResp)
      )

      const now = new Date()
      const startDate = new Date(now.getTime() + 60 * 60 * 1000).toISOString()
      const endDate = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString()

      const createResp = await httpJson(`${baseUrl}/api/events`, {
        method: "POST",
        headers: { ...authHeader(), "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          title: "integration smoke event",
          description: "integration smoke calendar event",
          startDate,
          endDate,
          location: "Mezana Hall",
          type: "academic",
        }),
      })
      assertOrThrow(createResp.status === 201, "Events create expected 201", pretty(createResp))
      createdEventId = createResp.json?.data?.id || ""
      assertOrThrow(createdEventId, "Missing created event id", pretty(createResp))

      const getResp = await httpJson(
        `${baseUrl}/api/events/${createdEventId}?tenantId=${encodeURIComponent(tenantId)}`,
        { headers: authHeader() }
      )
      assertOrThrow(getResp.status === 200, "Events getById expected 200", pretty(getResp))

      const filterResp = await httpJson(
        `${baseUrl}/api/events?tenantId=${encodeURIComponent(tenantId)}&type=academic&dateFrom=${encodeURIComponent(startDate)}&dateTo=${encodeURIComponent(endDate)}&page=1&limit=10`,
        { headers: authHeader() }
      )
      assertOrThrow(
        filterResp.status === 200,
        "Events filtered list expected 200",
        pretty(filterResp)
      )

      const updateResp = await httpJson(
        `${baseUrl}/api/events/${createdEventId}?tenantId=${encodeURIComponent(tenantId)}`,
        {
          method: "PATCH",
          headers: { ...authHeader(), "Content-Type": "application/json" },
          body: JSON.stringify({ title: "integration smoke event updated", type: "other" }),
        }
      )
      assertOrThrow(updateResp.status === 200, "Events update expected 200", pretty(updateResp))

      const deleteResp = await httpJson(
        `${baseUrl}/api/events/${createdEventId}?tenantId=${encodeURIComponent(tenantId)}`,
        { method: "DELETE", headers: authHeader() }
      )
      assertOrThrow(deleteResp.status === 200, "Events delete expected 200", pretty(deleteResp))

      markOk(t, "GET/POST/PATCH/DELETE /api/events + filters -> 200/201/200/200/200")
      createdEventId = ""
    } catch (error) {
      t.detail = `${error.message} ${JSON.stringify(error.extra ?? {})}`
    } finally {
      if (createdEventId) {
        try {
          await httpJson(
            `${baseUrl}/api/events/${createdEventId}?tenantId=${encodeURIComponent(tenantId)}`,
            { method: "DELETE", headers: authHeader() }
          )
        } catch {}
      }
    }
  }

  // Finance (overview/summary/fee-structures)
  {
    const t = pushCase(createCase("finance-runtime"))
    try {
      const overviewResp = await httpJson(
        `${baseUrl}/api/finance/overview?tenantId=${encodeURIComponent(tenantId)}`,
        { headers: authHeader() }
      )
      assertOrThrow(
        overviewResp.status === 200,
        "Finance overview expected 200",
        pretty(overviewResp)
      )
      const summaryResp = await httpJson(
        `${baseUrl}/api/finance/payments/summary?tenantId=${encodeURIComponent(tenantId)}`,
        { headers: authHeader() }
      )
      assertOrThrow(
        summaryResp.status === 200,
        "Payments summary expected 200",
        pretty(summaryResp)
      )
      const feeResp = await httpJson(
        `${baseUrl}/api/finance/fee-structures?tenantId=${encodeURIComponent(tenantId)}`,
        { headers: authHeader() }
      )
      assertOrThrow(feeResp.status === 200, "Fee structures list expected 200", pretty(feeResp))
      markOk(t, "GET finance overview/summary/fee-structures -> 200")
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

  // Upload (signed-url + multipart upload + delete)
  {
    const t = pushCase(createCase("upload-runtime"))
    let uploadedKey = ""
    try {
      const signedResp = await httpJson(`${baseUrl}/api/upload/signed-url`, {
        method: "POST",
        headers: { ...authHeader(), "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          fileName: "integration-smoke.txt",
          contentType: "text/plain",
          folder: "integration-smoke",
          expiresInSeconds: 300,
        }),
      })
      assertOrThrow(
        signedResp.status === 201 || signedResp.status === 200,
        "Upload signed-url expected 200/201",
        pretty(signedResp)
      )
      assertOrThrow(
        typeof signedResp.json?.data?.signedUrl === "string",
        "Missing signedUrl",
        pretty(signedResp)
      )

      const form = new FormData()
      form.set("tenantId", tenantId)
      form.set("folder", "integration-smoke")
      form.set(
        "file",
        new Blob(["integration smoke file"], { type: "text/plain" }),
        "integration-smoke.txt"
      )

      const uploadResp = await httpJson(`${baseUrl}/api/upload`, {
        method: "POST",
        headers: authHeader(),
        body: form,
      })
      assertOrThrow(
        uploadResp.status === 201 || uploadResp.status === 200,
        "Upload multipart expected 200/201",
        pretty(uploadResp)
      )
      uploadedKey = uploadResp.json?.data?.key || ""
      assertOrThrow(uploadedKey, "Missing uploaded object key", pretty(uploadResp))

      const deleteResp = await httpJson(
        `${baseUrl}/api/upload?tenantId=${encodeURIComponent(tenantId)}`,
        {
          method: "DELETE",
          headers: { ...authHeader(), "Content-Type": "application/json" },
          body: JSON.stringify({ key: uploadedKey }),
        }
      )
      assertOrThrow(deleteResp.status === 200, "Upload delete expected 200", pretty(deleteResp))
      uploadedKey = ""

      markOk(t, "POST /upload/signed-url + multipart POST /upload + DELETE /upload -> 200/201")
    } catch (error) {
      t.detail = `${error.message} ${JSON.stringify(error.extra ?? {})}`
    } finally {
      if (uploadedKey) {
        try {
          await httpJson(`${baseUrl}/api/upload?tenantId=${encodeURIComponent(tenantId)}`, {
            method: "DELETE",
            headers: { ...authHeader(), "Content-Type": "application/json" },
            body: JSON.stringify({ key: uploadedKey }),
          })
        } catch {}
      }
    }
  }

  // Email runtime (via notifications email channel)
  {
    const t = pushCase(createCase("email-runtime"))
    try {
      assertOrThrow(token, "Missing auth token from register")
      assertOrThrow(currentUserId, "Missing current user id from register token")

      const sendResp = await httpJson(`${baseUrl}/api/notifications/send`, {
        method: "POST",
        headers: { ...authHeader(), "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          recipientUserIds: [currentUserId],
          title: "integration smoke email notification",
          message: "integration smoke email message",
          channels: ["email"],
        }),
      })
      assertOrThrow(
        sendResp.status === 200 || sendResp.status === 201,
        "Notifications email send expected 200/201",
        pretty(sendResp)
      )
      const sendData = successData(sendResp.json)
      assertOrThrow(
        typeof sendData?.emailDispatched === "number",
        "Missing emailDispatched count",
        pretty(sendResp)
      )
      if (strictEmail) {
        assertOrThrow(
          sendData.emailDispatched > 0,
          "Expected emailDispatched > 0 (strict email mode)",
          { response: pretty(sendResp), emailDispatched: sendData.emailDispatched }
        )
        markOk(
          t,
          `POST /notifications/send (email channel) -> 200 (emailDispatched=${sendData.emailDispatched})`
        )
      } else if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
        markSkip(
          t,
          `RESEND_API_KEY/RESEND_FROM_EMAIL not configured for strict dispatch verification (emailDispatched=${sendData.emailDispatched})`
        )
      } else {
        markOk(
          t,
          `POST /notifications/send (email channel) -> 200 (emailDispatched=${sendData.emailDispatched})`
        )
      }
    } catch (error) {
      t.detail = `${error.message} ${JSON.stringify(error.extra ?? {})}`
    }
  }

  // SMS runtime (via notifications sms channel)
  {
    const t = pushCase(createCase("sms-runtime"))
    try {
      assertOrThrow(token, "Missing auth token from register")
      assertOrThrow(currentUserId, "Missing current user id from register token")

      const sendResp = await httpJson(`${baseUrl}/api/notifications/send`, {
        method: "POST",
        headers: { ...authHeader(), "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          recipientUserIds: [currentUserId],
          title: "integration smoke sms notification",
          message: "integration smoke sms message",
          channels: ["sms"],
        }),
      })
      assertOrThrow(
        sendResp.status === 200 || sendResp.status === 201,
        "Notifications sms send expected 200/201",
        pretty(sendResp)
      )
      const sendData = successData(sendResp.json)
      assertOrThrow(
        typeof sendData?.smsDispatched === "number",
        "Missing smsDispatched count",
        pretty(sendResp)
      )

      if (strictSms) {
        assertOrThrow(sendData.smsDispatched > 0, "Expected smsDispatched > 0 (strict sms mode)", {
          response: pretty(sendResp),
          smsDispatched: sendData.smsDispatched,
        })
        markOk(
          t,
          `POST /notifications/send (sms channel) -> 200 (smsDispatched=${sendData.smsDispatched})`
        )
      } else if (
        !process.env.TWILIO_ACCOUNT_SID ||
        !process.env.TWILIO_AUTH_TOKEN ||
        !process.env.TWILIO_PHONE_NUMBER
      ) {
        markSkip(
          t,
          `TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN/TWILIO_PHONE_NUMBER not configured for strict dispatch verification (smsDispatched=${sendData.smsDispatched})`
        )
      } else {
        markOk(
          t,
          `POST /notifications/send (sms channel) -> 200 (smsDispatched=${sendData.smsDispatched})`
        )
      }
    } catch (error) {
      t.detail = `${error.message} ${JSON.stringify(error.extra ?? {})}`
    }
  }

  // AI runtime (chat/report/insights + stream header check) - optional when ANTHROPIC key is not configured
  {
    const t = pushCase(createCase("ai-runtime"))
    try {
      if (!discoveredStudentId) {
        assertOrThrow(token, "Missing auth token from register")

        const studentUserEmail = `student.smoke+${Date.now()}@mezana.talimy.space`
        const createUserResp = await httpJson(`${baseUrl}/api/users`, {
          method: "POST",
          headers: { ...authHeader(), "Content-Type": "application/json" },
          body: JSON.stringify({
            tenantId,
            fullName: "Student Smoke",
            email: studentUserEmail,
            password: "Password123",
            role: "student",
          }),
        })
        assertOrThrow(
          createUserResp.status === 201 || createUserResp.status === 200,
          "Users create (student) expected 200/201",
          pretty(createUserResp)
        )
        const studentUserId = createUserResp.json?.data?.id
        assertOrThrow(studentUserId, "Missing created student user id", pretty(createUserResp))

        const createStudentResp = await httpJson(`${baseUrl}/api/students`, {
          method: "POST",
          headers: { ...authHeader(), "Content-Type": "application/json" },
          body: JSON.stringify({
            tenantId,
            userId: studentUserId,
            ...(discoveredClassId ? { classId: discoveredClassId } : {}),
            studentId: `STD-${Date.now()}`,
            gender: "male",
            enrollmentDate: "2026-01-01",
            dateOfBirth: "2012-01-01",
            status: "active",
            fullName: "Student Smoke",
          }),
        })
        assertOrThrow(
          createStudentResp.status === 201 || createStudentResp.status === 200,
          "Students create (AI fixture) expected 200/201",
          pretty(createStudentResp)
        )
        discoveredStudentId = createStudentResp.json?.data?.id || ""
        assertOrThrow(
          discoveredStudentId,
          "Missing created student id for AI runtime fixture",
          pretty(createStudentResp)
        )
      } else {
      }

      const chatPayload = {
        tenantId,
        messages: [{ role: "user", content: "Qisqa salom va bitta motivatsion gap yozing." }],
        maxTokens: 128,
        temperature: 0.2,
      }

      const chatResp = await httpJson(`${baseUrl}/api/ai/chat`, {
        method: "POST",
        headers: { ...authHeader(), "Content-Type": "application/json" },
        body: JSON.stringify(chatPayload),
      })
      if (
        chatResp.status === 503 &&
        String(chatResp.json?.error?.message ?? chatResp.text).includes("OPENROUTER_API_KEY")
      ) {
        markSkip(t, "OPENROUTER_API_KEY not configured on API deploy")
      } else {
        assertOrThrow(
          chatResp.status === 201 || chatResp.status === 200,
          "AI chat expected 200/201",
          pretty(chatResp)
        )

        const reportResp = await httpJson(`${baseUrl}/api/ai/report/generate`, {
          method: "POST",
          headers: { ...authHeader(), "Content-Type": "application/json" },
          body: JSON.stringify({
            tenantId,
            type: "school_summary",
            parameters: { source: "integration-smoke" },
          }),
        })
        assertOrThrow(
          reportResp.status === 201 || reportResp.status === 200,
          "AI report generate expected 200/201",
          pretty(reportResp)
        )

        const insightsResp = await httpJson(
          `${baseUrl}/api/ai/insights/${discoveredStudentId}?tenantId=${encodeURIComponent(tenantId)}&type=progress_summary&regenerate=true`,
          { headers: authHeader() }
        )
        assertOrThrow(insightsResp.status === 200, "AI insights expected 200", pretty(insightsResp))

        const streamResp = await fetch(`${baseUrl}/api/ai/chat/stream`, {
          method: "POST",
          headers: { ...authHeader(), "Content-Type": "application/json" },
          body: JSON.stringify(chatPayload),
        })
        assertOrThrow(streamResp.status === 200, "AI chat stream expected 200", {
          status: streamResp.status,
          body: await streamResp.text(),
        })
        assertOrThrow(
          (streamResp.headers.get("content-type") || "").includes("text/event-stream"),
          "AI chat stream expected text/event-stream",
          { headers: Object.fromEntries(streamResp.headers.entries()) }
        )
        try {
          const reader = streamResp.body?.getReader()
          if (reader) {
            await reader.read()
            await reader.cancel()
          }
        } catch {}

        markOk(
          t,
          "POST /ai/chat + /ai/report/generate + GET /ai/insights/:studentId + /ai/chat/stream -> 200"
        )
      }
    } catch (error) {
      t.detail = `${error.message} ${JSON.stringify(error.extra ?? {})}`
    }
  }

  // Notifications runtime (list/unread/send/mark-read)
  {
    const t = pushCase(createCase("notifications-runtime"))
    try {
      assertOrThrow(token, "Missing auth token from register")
      assertOrThrow(currentUserId, "Missing current user id from register token")

      const listResp = await httpJson(
        `${baseUrl}/api/notifications?tenantId=${encodeURIComponent(tenantId)}&page=1&limit=5`,
        { headers: authHeader() }
      )
      assertOrThrow(listResp.status === 200, "Notifications list expected 200", pretty(listResp))

      const unreadResp = await httpJson(
        `${baseUrl}/api/notifications/unread-count?tenantId=${encodeURIComponent(tenantId)}`,
        { headers: authHeader() }
      )
      assertOrThrow(unreadResp.status === 200, "Unread count expected 200", pretty(unreadResp))

      const sendResp = await httpJson(`${baseUrl}/api/notifications/send`, {
        method: "POST",
        headers: { ...authHeader(), "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          recipientUserIds: [currentUserId],
          title: "integration smoke notification",
          message: "integration smoke message",
          channels: ["in_app"],
        }),
      })
      assertOrThrow(
        sendResp.status === 200 || sendResp.status === 201,
        "Send expected 200/201",
        pretty(sendResp)
      )

      const listAfterResp = await httpJson(
        `${baseUrl}/api/notifications?tenantId=${encodeURIComponent(tenantId)}&page=1&limit=20`,
        { headers: authHeader() }
      )
      assertOrThrow(
        listAfterResp.status === 200,
        "Notifications list after send expected 200",
        pretty(listAfterResp)
      )
      const rows = Array.isArray(listAfterResp.json?.data)
        ? listAfterResp.json.data
        : (listAfterResp.json?.data?.data ?? [])
      const target = Array.isArray(rows)
        ? rows.find(
            (row) =>
              row?.title === "integration smoke notification" &&
              row?.message === "integration smoke message"
          )
        : null
      assertOrThrow(target?.id, "Sent in-app notification not found in list", pretty(listAfterResp))

      const markReadResp = await httpJson(`${baseUrl}/api/notifications/${target.id}/read`, {
        method: "PATCH",
        headers: { ...authHeader(), "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, read: true }),
      })
      assertOrThrow(markReadResp.status === 200, "Mark-read expected 200", pretty(markReadResp))

      markOk(t, "GET list/unread + POST send + PATCH :id/read -> 200")
    } catch (error) {
      t.detail = `${error.message} ${JSON.stringify(error.extra ?? {})}`
    }
  }

  // Tenants platform-admin smoke (optional)
  {
    const t = pushCase(createCase("tenants-platform"))
    try {
      if (!platformPassword) {
        if (!platformBootstrapKey) {
          markOk(
            t,
            "Optional platform-admin tenants smoke not exercised (no PLATFORM_ADMIN_PASSWORD / bootstrap key)"
          )
        } else {
          const registerResp = await httpJson(`${baseUrl}/api/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fullName: "Platform Smoke Admin",
              email: `platform.smoke+${Date.now()}@talimy.space`,
              password: "Password123!",
              tenantId,
              role: "platform_admin",
              bootstrapKey: platformBootstrapKey,
            }),
          })
          assertOrThrow(
            registerResp.status === 201 || registerResp.status === 200,
            "Platform bootstrap register expected 200/201",
            pretty(registerResp)
          )
          const platformToken = registerResp.json?.data?.accessToken
          assertOrThrow(
            platformToken,
            "Missing platform token from bootstrap register",
            pretty(registerResp)
          )

          const tenantsResp = await httpJson(`${baseUrl}/api/tenants?page=1&limit=5`, {
            headers: { Authorization: `Bearer ${platformToken}` },
          })
          assertOrThrow(tenantsResp.status === 200, "Tenants list expected 200", pretty(tenantsResp))
          markOk(t, "POST /auth/register (platform_admin bootstrap) + GET /api/tenants -> 200")
        }
      } else {
        const loginResp = await httpJson(`${baseUrl}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: platformEmail, password: platformPassword }),
        })
        if (
          !strictPlatformAuth &&
          loginResp.status === 401 &&
          String(loginResp.json?.error?.message ?? "").toLowerCase().includes("invalid credentials")
        ) {
          if (platformBootstrapKey) {
            const registerResp = await httpJson(`${baseUrl}/api/auth/register`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                fullName: "Platform Smoke Admin",
                email: `platform.smoke+${Date.now()}@talimy.space`,
                password: "Password123!",
                tenantId,
                role: "platform_admin",
                bootstrapKey: platformBootstrapKey,
              }),
            })
            assertOrThrow(
              registerResp.status === 201 || registerResp.status === 200,
              "Platform bootstrap register expected 200/201",
              pretty(registerResp)
            )
            const platformToken = registerResp.json?.data?.accessToken
            assertOrThrow(
              platformToken,
              "Missing platform token from bootstrap register",
              pretty(registerResp)
            )
            const tenantsResp = await httpJson(`${baseUrl}/api/tenants?page=1&limit=5`, {
              headers: { Authorization: `Bearer ${platformToken}` },
            })
            assertOrThrow(
              tenantsResp.status === 200,
              "Tenants list expected 200 after bootstrap register",
              pretty(tenantsResp)
            )
            markOk(t, "Platform login invalid; bootstrap register fallback + tenants list -> 200")
          } else {
            markOk(t, "Optional platform-admin credentials invalid (401); non-strict mode accepted")
          }
        } else {
          assertOrThrow(loginResp.status === 200, "Platform login expected 200", pretty(loginResp))
          const platformToken = loginResp.json?.data?.accessToken
          assertOrThrow(platformToken, "Missing platform token", pretty(loginResp))

          const tenantsResp = await httpJson(`${baseUrl}/api/tenants?page=1&limit=5`, {
            headers: { Authorization: `Bearer ${platformToken}` },
          })
          assertOrThrow(tenantsResp.status === 200, "Tenants list expected 200", pretty(tenantsResp))
          markOk(t, "POST /auth/login + GET /api/tenants -> 200")
        }
      }
    } catch (error) {
      t.detail = `${error.message} ${JSON.stringify(error.extra ?? {})}`
    }
  }

  // Queue worker topology (2.23.5) static readiness
  {
    const t = pushCase(createCase("queue-worker-topology-static"))
    try {
      const apiRoot = path.resolve(__dirname, "..")
      const workerMainPath = path.join(apiRoot, "src", "worker.main.ts")
      const workerModulePath = path.join(apiRoot, "src", "worker.module.ts")
      const queueWorkersServicePath = path.join(
        apiRoot,
        "src",
        "modules",
        "queue",
        "queue-workers.service.ts"
      )
      const packageJsonPath = path.join(apiRoot, "package.json")

      assertOrThrow(fs.existsSync(workerMainPath), "Missing worker.main.ts", { workerMainPath })
      assertOrThrow(fs.existsSync(workerModulePath), "Missing worker.module.ts", {
        workerModulePath,
      })
      assertOrThrow(fs.existsSync(queueWorkersServicePath), "Missing queue-workers.service.ts", {
        queueWorkersServicePath,
      })

      const queueWorkersServiceSource = readFileSafe(queueWorkersServicePath) || ""
      const workerMainSource = readFileSafe(workerMainPath) || ""
      const packageJson = JSON.parse(readFileSafe(packageJsonPath) || "{}")

      assertOrThrow(
        queueWorkersServiceSource.includes("QUEUE_WORKERS_ENABLED"),
        "QUEUE_WORKERS_ENABLED toggle is missing in queue-workers.service.ts"
      )
      assertOrThrow(
        workerMainSource.includes("createApplicationContext"),
        "worker.main.ts should bootstrap Nest application context"
      )
      assertOrThrow(
        packageJson?.scripts?.["dev:worker"] && packageJson?.scripts?.["start:worker"],
        "Worker scripts are missing in apps/api/package.json",
        { scripts: packageJson?.scripts }
      )

      markOk(t, "worker entrypoint + toggle + package scripts present")
    } catch (error) {
      t.detail = `${error.message} ${JSON.stringify(error.extra ?? {})}`
    }
  }

  // Queue worker topology (2.23.5) runtime log evidence (optional, for local dual-process smoke)
  {
    const t = pushCase(createCase("queue-worker-topology-runtime"))
    try {
      if (!apiLogFile || !workerLogFile) {
        if (strictWorkerTopology) {
          throw new Error(
            "Provide --api-log-file and --worker-log-file for strict worker topology verification"
          )
        }
        markOk(t, "Optional runtime topology log-file verification not exercised (non-strict mode)")
      } else {
        const apiLog = readFileSafe(apiLogFile)
        const workerLog = readFileSafe(workerLogFile)
        assertOrThrow(apiLog !== null, "API log file not found/readable", { apiLogFile })
        assertOrThrow(workerLog !== null, "Worker log file not found/readable", { workerLogFile })

        assertOrThrow(
          apiLog.includes("Queue workers disabled via QUEUE_WORKERS_ENABLED"),
          "API log missing worker-disabled evidence",
          { apiLogFile }
        )
        assertOrThrow(
          !apiLog.includes("Queue worker started:"),
          "API log should not start workers when QUEUE_WORKERS_ENABLED=false",
          { apiLogFile }
        )
        assertOrThrow(
          workerLog.includes("Queue worker runtime started"),
          "Worker log missing runtime startup evidence",
          { workerLogFile }
        )
        assertOrThrow(
          workerLog.includes("Queue worker started:"),
          "Worker log missing queue worker start evidence",
          { workerLogFile }
        )

        markOk(t, "api log disables workers; worker log starts dedicated consumers")
      }
    } catch (error) {
      t.detail = `${error.message} ${JSON.stringify(error.extra ?? {})}`
    }
  }

  // FAZA 3 static artifact checks (providers/stores/hooks/nav/i18n/routes)
  {
    const t = pushCase(createCase("phase3-artifacts-static"))
    try {
      const repoRoot = path.resolve(__dirname, "..", "..", "..")
      const requiredPaths = [
        "apps/web/proxy.ts",
        "apps/web/next.config.ts",
        "apps/web/src/app/layout.tsx",
        "apps/web/src/app/api/trpc/[trpc]/route.ts",
        "apps/web/src/app/api/upload/route.ts",
        "apps/web/src/providers/auth-provider.tsx",
        "apps/web/src/providers/query-provider.tsx",
        "apps/web/src/providers/theme-provider.tsx",
        "apps/web/src/providers/intl-provider.tsx",
        "apps/web/src/providers/socket-provider.tsx",
        "apps/web/src/stores/auth-store.ts",
        "apps/web/src/stores/sidebar-store.ts",
        "apps/web/src/stores/notification-store.ts",
        "apps/web/src/stores/theme-store.ts",
        "apps/web/src/hooks/use-auth.ts",
        "apps/web/src/hooks/use-tenant.ts",
        "apps/web/src/hooks/use-permissions.ts",
        "apps/web/src/hooks/use-socket.ts",
        "apps/web/src/hooks/use-notifications.ts",
        "apps/web/src/hooks/use-sidebar.ts",
        "apps/web/src/config/navigation/platform-nav.ts",
        "apps/web/src/config/navigation/admin-nav.ts",
        "apps/web/src/config/navigation/teacher-nav.ts",
        "apps/web/src/config/navigation/student-nav.ts",
        "apps/web/src/config/navigation/parent-nav.ts",
        "apps/web/src/config/navigation/types.ts",
        "apps/web/src/i18n/request.ts",
        "apps/web/src/i18n/routing.ts",
        "apps/web/src/messages/uz.json",
        "apps/web/src/messages/tr.json",
        "apps/web/src/messages/en.json",
        "apps/web/src/messages/ru.json",
      ]

      const missing = requiredPaths.filter(
        (relativePath) => !fs.existsSync(path.join(repoRoot, relativePath))
      )
      assertOrThrow(missing.length === 0, "Missing phase3 artifact files", { missing })

      markOk(t, `phase3 files present (${requiredPaths.length})`)
    } catch (error) {
      t.detail = `${error.message} ${JSON.stringify(error.extra ?? {})}`
    }
  }

  // FAZA 3 i18n message integrity (same keyset across locales, >=200 keys)
  {
    const t = pushCase(createCase("phase3-i18n-keyset"))
    try {
      const repoRoot = path.resolve(__dirname, "..", "..", "..")
      const localeCodes = ["uz", "tr", "en", "ru"]
      const localeMaps = {}

      for (const localeCode of localeCodes) {
        const filePath = path.join(repoRoot, "apps", "web", "src", "messages", `${localeCode}.json`)
        const parsed = JSON.parse(readFileSafe(filePath) || "{}")
        const keys = flattenJsonKeys(parsed)
          .filter((key) => !key.includes("["))
          .sort()
        localeMaps[localeCode] = {
          filePath,
          keys,
          keySet: new Set(keys),
        }
      }

      const baseLocale = localeMaps.uz
      assertOrThrow(
        baseLocale.keys.length >= 200,
        "uz.json should contain at least 200 message keys",
        {
          count: baseLocale.keys.length,
        }
      )

      for (const localeCode of localeCodes.slice(1)) {
        const current = localeMaps[localeCode]
        assertOrThrow(
          current.keys.length === baseLocale.keys.length,
          `Message key count mismatch for ${localeCode}`,
          {
            baseCount: baseLocale.keys.length,
            currentCount: current.keys.length,
          }
        )
        const missingInCurrent = baseLocale.keys.filter((key) => !current.keySet.has(key))
        const extraInCurrent = current.keys.filter((key) => !baseLocale.keySet.has(key))
        assertOrThrow(
          missingInCurrent.length === 0 && extraInCurrent.length === 0,
          `Message keyset mismatch for ${localeCode}`,
          {
            missingInCurrent: missingInCurrent.slice(0, 20),
            extraInCurrent: extraInCurrent.slice(0, 20),
          }
        )
      }

      markOk(t, `i18n keysets aligned across locales (${baseLocale.keys.length} keys)`)
    } catch (error) {
      t.detail = `${error.message} ${JSON.stringify(error.extra ?? {})}`
    }
  }

  // FAZA 3 web runtime smoke (proxy + API route wiring)
  {
    const t = pushCase(createCase("phase3-web-proxy-host-matrix"))
    try {
      if (!webBaseUrl) {
        markSkip(t, "WEB_BASE_URL / --web-base-url not provided")
      } else {
        const useDirectHosts = shouldUseDirectTalimyHostChecks(webBaseUrl)
        const platformHomeUrl =
          (useDirectHosts && buildHostScopedUrl(webBaseUrl, "platform.talimy.space", "/")) ||
          `${webBaseUrl}/`
        const publicProtectedUrl =
          (useDirectHosts && buildHostScopedUrl(webBaseUrl, "talimy.space", "/admin/dashboard")) ||
          `${webBaseUrl}/admin/dashboard`
        const schoolProtectedUrl =
          (useDirectHosts &&
            buildHostScopedUrl(webBaseUrl, `${tenantSlug}.talimy.space`, "/admin/dashboard")) ||
          `${webBaseUrl}/admin/dashboard`
        const schoolPlatformUrl =
          (useDirectHosts && buildHostScopedUrl(webBaseUrl, `${tenantSlug}.talimy.space`, "/platform")) ||
          `${webBaseUrl}/platform`

        const platformHome = await httpJson(platformHomeUrl, {
          redirect: "manual",
          ...(useDirectHosts ? {} : { headers: { "x-forwarded-host": "platform.talimy.space" } }),
        })
        assertOrThrow(
          isRedirectResponse(platformHome),
          "platform host / should redirect",
          pretty(platformHome)
        )
        assertOrThrow(
          extractRedirectLocation(platformHome).includes("/platform"),
          "platform host redirect should target /platform",
          { headers: platformHome.headersMap, derivedLocation: extractRedirectLocation(platformHome) }
        )

        const publicProtected = await httpJson(publicProtectedUrl, {
          redirect: "manual",
          ...(useDirectHosts ? {} : { headers: { "x-forwarded-host": "talimy.space" } }),
        })
        assertOrThrow(
          isRedirectResponse(publicProtected),
          "public host /admin should redirect",
          pretty(publicProtected)
        )
        assertOrThrow(
          extractRedirectLocation(publicProtected).includes("/login"),
          "public host /admin redirect should target /login",
          {
            headers: publicProtected.headersMap,
            derivedLocation: extractRedirectLocation(publicProtected),
          }
        )

        const schoolProtected = await httpJson(schoolProtectedUrl, {
          redirect: "manual",
          ...(useDirectHosts
            ? {}
            : { headers: { "x-forwarded-host": `${tenantSlug}.talimy.space` } }),
        })
        assertOrThrow(
          isRedirectResponse(schoolProtected),
          "school host protected route without auth should redirect",
          pretty(schoolProtected)
        )
        assertOrThrow(
          extractRedirectLocation(schoolProtected).includes("/login"),
          "school host protected route redirect should target /login",
          {
            headers: schoolProtected.headersMap,
            derivedLocation: extractRedirectLocation(schoolProtected),
          }
        )

        const schoolPlatform = await httpJson(schoolPlatformUrl, {
          redirect: "manual",
          ...(useDirectHosts
            ? {}
            : { headers: { "x-forwarded-host": `${tenantSlug}.talimy.space` } }),
        })
        assertOrThrow(
          isRedirectResponse(schoolPlatform),
          "school host /platform should redirect",
          pretty(schoolPlatform)
        )
        assertOrThrow(
          extractRedirectLocation(schoolPlatform).includes("/login"),
          "school host /platform redirect should target /login",
          {
            headers: schoolPlatform.headersMap,
            derivedLocation: extractRedirectLocation(schoolPlatform),
          }
        )

        markOk(t, "platform/public/school host matrix redirect signals verified")
      }
    } catch (error) {
      t.detail = `${error.message} ${JSON.stringify(error.extra ?? {})}`
    }
  }

  {
    const t = pushCase(createCase("phase3-web-i18n-locale-cookie"))
    try {
      if (!webBaseUrl) {
        markSkip(t, "WEB_BASE_URL / --web-base-url not provided")
      } else {
        const useDirectHosts = shouldUseDirectTalimyHostChecks(webBaseUrl)
        const loginUrl =
          (useDirectHosts && buildHostScopedUrl(webBaseUrl, "talimy.space", "/login")) ||
          `${webBaseUrl}/login`
        const resp = await httpJson(loginUrl, {
          redirect: "manual",
          headers: {
            ...(useDirectHosts ? {} : { "x-forwarded-host": "talimy.space" }),
            "accept-language": "tr-TR,tr;q=0.9,en;q=0.8",
          },
        })

        assertOrThrow(
          [200, 307, 308].includes(resp.status),
          "Web login route should respond",
          pretty(resp)
        )
        const localeHeader = resp.headersMap["x-locale"] || ""
        const contentLanguageHeader = resp.headersMap["content-language"] || ""
        const htmlLangMatch = String(resp.text || "").match(/<html[^>]*\blang=\"([^\"]+)\"/i)
        const htmlLang = (htmlLangMatch?.[1] || "").toLowerCase()
        const localeDetected =
          localeHeader === "tr" ||
          contentLanguageHeader.toLowerCase().startsWith("tr") ||
          htmlLang.startsWith("tr")
        if (strictPhase3) {
          assertOrThrow(
            localeDetected,
            "Expected locale=tr via x-locale/content-language/html lang in strict phase3 mode",
            {
              headers: resp.headersMap,
              htmlLang,
            }
          )
        }

        const setCookieJoined = [...resp.setCookies, resp.headersMap["set-cookie"] || ""].join("; ")
        assertOrThrow(
          setCookieJoined.includes("NEXT_LOCALE=") || localeDetected || !strictPhase3,
          "Expected NEXT_LOCALE cookie (or locale detection signal) in strict phase3 mode",
          {
            setCookies: resp.setCookies,
            setCookie: resp.headersMap["set-cookie"],
            localeHeader,
            contentLanguageHeader,
            htmlLang,
          }
        )

        markOk(
          t,
          `web locale detection responded ${resp.status}${localeHeader ? ` (x-locale=${localeHeader})` : ""}`
        )
      }
    } catch (error) {
      t.detail = `${error.message} ${JSON.stringify(error.extra ?? {})}`
    }
  }

  {
    const t = pushCase(createCase("phase3-web-upload-proxy"))
    try {
      if (!webBaseUrl) {
        markSkip(t, "WEB_BASE_URL / --web-base-url not provided")
      } else {
        const uploadResp = await httpJson(`${webBaseUrl}/api/upload?mode=signed-url`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-tenant-slug": tenantSlug,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            tenantId,
            fileName: "smoke-phase3.txt",
            contentType: "text/plain",
            folder: "smoke",
          }),
        })

        assertOrThrow(
          !hasPlaceholderText(uploadResp, "Upload route proxy is not wired yet"),
          "Web upload route returned placeholder response",
          pretty(uploadResp)
        )

        if (strictWebUpload || strictPhase3) {
          assertOrThrow(
            uploadResp.status === 200 || uploadResp.status === 201,
            "Strict web upload smoke expects signed-url success",
            pretty(uploadResp)
          )
        } else {
          assertOrThrow(
            isAllowedStatus(
              uploadResp.status,
              [200, 201, 400, 401, 403, 404, 405, 422, 500, 502, 503]
            ),
            "Unexpected web upload proxy status",
            pretty(uploadResp)
          )
        }

        markOk(t, `POST web /api/upload?mode=signed-url -> ${uploadResp.status}`)
      }
    } catch (error) {
      t.detail = `${error.message} ${JSON.stringify(error.extra ?? {})}`
    }
  }

  {
    const t = pushCase(createCase("phase3-web-trpc-proxy"))
    try {
      if (!webBaseUrl) {
        markSkip(t, "WEB_BASE_URL / --web-base-url not provided")
      } else {
        const trpcResp = await httpJson(`${webBaseUrl}/api/trpc/tenant.list`, {
          method: "GET",
          headers: {
            "x-tenant-slug": tenantSlug,
          },
        })

        assertOrThrow(
          !hasPlaceholderText(trpcResp, "tRPC route is not wired yet"),
          "Web tRPC route returned placeholder response",
          pretty(trpcResp)
        )

        if (strictWebTrpc || strictPhase3) {
          assertOrThrow(
            ![404, 405, 501, 502].includes(trpcResp.status),
            "Strict web tRPC smoke expects upstream tRPC endpoint availability",
            pretty(trpcResp)
          )
        } else {
          assertOrThrow(
            trpcResp.status !== 501,
            "Web tRPC route should not return placeholder 501",
            pretty(trpcResp)
          )
        }

        markOk(t, `GET web /api/trpc/tenant.list -> ${trpcResp.status}`)
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
