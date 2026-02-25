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

function extractRows(envelope) {
  const data = envelope?.data
  if (Array.isArray(data)) return data
  if (data && Array.isArray(data.data)) return data.data
  if (data && Array.isArray(data.items)) return data.items
  return []
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

  // AI runtime (chat/report/insights + stream header check) - optional when ANTHROPIC key is not configured
  {
    const t = pushCase(createCase("ai-runtime"))
    try {
      if (!discoveredStudentId) {
        markSkip(t, "No student row available for AI insights")
      } else {
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
          String(chatResp.json?.error?.message ?? chatResp.text).includes("ANTHROPIC_API_KEY")
        ) {
          markSkip(t, "ANTHROPIC_API_KEY not configured on API deploy")
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
          assertOrThrow(
            insightsResp.status === 200,
            "AI insights expected 200",
            pretty(insightsResp)
          )

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
