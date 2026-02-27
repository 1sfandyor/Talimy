#!/usr/bin/env node

/* eslint-disable no-console */
const fs = require("node:fs")
const os = require("node:os")
const path = require("node:path")
const { spawn, spawnSync } = require("node:child_process")

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

function getArg(name, fallback = "") {
  const prefix = `--${name}=`
  const hit = process.argv.find((arg) => arg.startsWith(prefix))
  return hit ? hit.slice(prefix.length) : fallback
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function readFileSafe(filePath) {
  try {
    return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : ""
  } catch {
    return ""
  }
}

async function terminateProcess(child, name) {
  if (!child || child.exitCode !== null) return

  child.kill("SIGTERM")
  for (let i = 0; i < 20; i += 1) {
    if (child.exitCode !== null) return
    await delay(100)
  }

  console.warn(`[smoke:queue-dual] ${name} did not stop after SIGTERM, sending SIGKILL`)
  child.kill("SIGKILL")
}

function ensureDistBuild(apiRoot) {
  const mainEntry = path.join(apiRoot, "dist", "main.js")
  const workerEntry = path.join(apiRoot, "dist", "worker.main.js")
  if (fs.existsSync(mainEntry) && fs.existsSync(workerEntry)) {
    return { mainEntry, workerEntry }
  }

  console.log("[smoke:queue-dual] dist artifacts missing, running `bun run build`...")
  const build = spawnSync("bun", ["run", "build"], {
    cwd: apiRoot,
    stdio: "inherit",
    shell: process.platform === "win32",
  })
  if (build.status !== 0) {
    throw new Error("apps/api build failed; cannot run dual-process smoke")
  }

  if (!fs.existsSync(mainEntry) || !fs.existsSync(workerEntry)) {
    throw new Error("Build completed but dist/main.js or dist/worker.main.js is missing")
  }

  return { mainEntry, workerEntry }
}

async function main() {
  const apiRoot = path.resolve(__dirname, "..")
  const repoRoot = path.resolve(apiRoot, "..", "..")
  loadDotEnvFile(path.join(apiRoot, ".env"))
  loadDotEnvFile(path.join(repoRoot, "apps", "web", ".env.local"))
  loadDotEnvFile(path.join(repoRoot, ".env"))

  const timeoutMs = Number(getArg("timeout-ms", "45000"))
  const apiPort = Number(getArg("api-port", "4100"))
  const apiLogFile =
    getArg("api-log-file", "") || path.join(os.tmpdir(), `talimy-api-dual-${Date.now()}.log`)
  const workerLogFile =
    getArg("worker-log-file", "") ||
    path.join(os.tmpdir(), `talimy-worker-dual-${Date.now()}.log`)

  if (!process.env.DATABASE_URL || !process.env.REDIS_URL) {
    throw new Error("DATABASE_URL and REDIS_URL must be set for dual-process smoke")
  }
  if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
    throw new Error("JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be set for dual-process smoke")
  }

  const { mainEntry, workerEntry } = ensureDistBuild(apiRoot)
  fs.writeFileSync(apiLogFile, "", "utf8")
  fs.writeFileSync(workerLogFile, "", "utf8")

  const apiOut = fs.createWriteStream(apiLogFile, { flags: "a" })
  const workerOut = fs.createWriteStream(workerLogFile, { flags: "a" })

  console.log(`[smoke:queue-dual] API log: ${apiLogFile}`)
  console.log(`[smoke:queue-dual] Worker log: ${workerLogFile}`)

  const apiProcess = spawn(process.execPath, [mainEntry], {
    cwd: apiRoot,
    env: {
      ...process.env,
      NODE_ENV: process.env.NODE_ENV || "production",
      PORT: String(apiPort),
      QUEUE_WORKERS_ENABLED: "false",
      APP_RUNTIME: "api",
    },
    stdio: ["ignore", "pipe", "pipe"],
  })
  apiProcess.stdout.pipe(apiOut)
  apiProcess.stderr.pipe(apiOut)

  const workerProcess = spawn(process.execPath, [workerEntry], {
    cwd: apiRoot,
    env: {
      ...process.env,
      NODE_ENV: process.env.NODE_ENV || "production",
      QUEUE_WORKERS_ENABLED: "true",
      APP_RUNTIME: "queue-worker",
    },
    stdio: ["ignore", "pipe", "pipe"],
  })
  workerProcess.stdout.pipe(workerOut)
  workerProcess.stderr.pipe(workerOut)

  try {
    const startedAt = Date.now()
    while (Date.now() - startedAt < timeoutMs) {
      if (apiProcess.exitCode !== null) {
        throw new Error(`API process exited early (code=${apiProcess.exitCode})`)
      }
      if (workerProcess.exitCode !== null) {
        throw new Error(`Worker process exited early (code=${workerProcess.exitCode})`)
      }

      const apiLog = readFileSafe(apiLogFile)
      const workerLog = readFileSafe(workerLogFile)

      const apiHasDisabledMessage = apiLog.includes("Queue workers disabled via QUEUE_WORKERS_ENABLED")
      const apiHasWorkerStart = apiLog.includes("Queue worker started:")
      const workerHasRuntimeStarted = workerLog.includes("Queue worker runtime started")
      const workerHasWorkerStart = workerLog.includes("Queue worker started:")

      if (apiHasDisabledMessage && !apiHasWorkerStart && workerHasRuntimeStarted && workerHasWorkerStart) {
        console.log("[smoke:queue-dual] PASS: API disabled workers, worker process started consumers")
        return
      }

      await delay(500)
    }

    const apiTail = readFileSafe(apiLogFile).split(/\r?\n/).slice(-40).join("\n")
    const workerTail = readFileSafe(workerLogFile).split(/\r?\n/).slice(-40).join("\n")
    throw new Error(
      `Timeout waiting for topology evidence\n--- API tail ---\n${apiTail}\n--- Worker tail ---\n${workerTail}`
    )
  } finally {
    await terminateProcess(apiProcess, "api")
    await terminateProcess(workerProcess, "worker")
    apiOut.end()
    workerOut.end()
  }
}

main().catch((error) => {
  console.error(`[smoke:queue-dual] FAIL: ${error.message}`)
  process.exit(1)
})
