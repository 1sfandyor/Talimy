import { resolve } from "node:path"
import { config } from "dotenv"
import { Pool } from "pg"

config({ path: resolve(process.cwd(), ".env") })
config({ path: resolve(process.cwd(), "../../.env"), override: false })

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set for @talimy/database.")
}

export const pool = new Pool({
  connectionString: databaseUrl,
  ssl: databaseUrl.includes("localhost")
    ? false
    : {
        rejectUnauthorized: false,
      },
})
