import net from "node:net"
import tls from "node:tls"
import fs from "node:fs"
import path from "node:path"

type Parsed = {
  protocol: string
  host: string
  port: number
}

function parseConnectionUrl(raw: string, fallbackPort: number): Parsed {
  const url = new URL(raw)
  return {
    protocol: url.protocol.replace(":", ""),
    host: url.hostname,
    port: Number(url.port || fallbackPort),
  }
}

function loadEnvFile(filePath: string): void {
  if (!fs.existsSync(filePath)) return
  const content = fs.readFileSync(filePath, "utf8")
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    const value = trimmed
      .slice(eq + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "")
    if (!process.env[key]) {
      process.env[key] = value
    }
  }
}

function checkTcp(host: string, port: number, timeoutMs = 7000): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = net.connect({ host, port })
    const onFail = (err: Error) => {
      socket.destroy()
      reject(err)
    }
    socket.setTimeout(timeoutMs, () => onFail(new Error("TCP timeout")))
    socket.once("error", onFail)
    socket.once("connect", () => {
      socket.end()
      resolve()
    })
  })
}

function checkTls(host: string, port: number, timeoutMs = 7000): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({
      host,
      port,
      servername: host,
      rejectUnauthorized: false,
    })
    const onFail = (err: Error) => {
      socket.destroy()
      reject(err)
    }
    socket.setTimeout(timeoutMs, () => onFail(new Error("TLS timeout")))
    socket.once("error", onFail)
    socket.once("secureConnect", () => {
      socket.end()
      resolve()
    })
  })
}

async function main(): Promise<void> {
  loadEnvFile(path.resolve(".env"))
  loadEnvFile(path.resolve("apps/api/.env"))

  const dbUrl = process.env.DATABASE_URL
  const redisUrl = process.env.REDIS_URL

  if (!dbUrl || !redisUrl) {
    console.error("Missing env: DATABASE_URL and/or REDIS_URL")
    process.exit(1)
  }

  const db = parseConnectionUrl(dbUrl, 5432)
  const redis = parseConnectionUrl(redisUrl, 6379)

  console.log(`Checking PostgreSQL TCP ${db.host}:${db.port} ...`)
  await checkTcp(db.host, db.port)
  console.log("PostgreSQL reachable")

  console.log(`Checking Redis ${redis.protocol.toUpperCase()} ${redis.host}:${redis.port} ...`)
  if (redis.protocol === "rediss") {
    await checkTls(redis.host, redis.port)
  } else {
    await checkTcp(redis.host, redis.port)
  }
  console.log("Redis reachable")
}

main().catch((error) => {
  console.error("Infra check failed:", error instanceof Error ? error.message : error)
  process.exit(1)
})
