import { migrate } from "drizzle-orm/node-postgres/migrator"
import { db } from "./index"
import { pool } from "./client"

export async function runMigrations(): Promise<void> {
  await migrate(db, { migrationsFolder: "./drizzle" })
  await pool.end()
}

if (import.meta.main) {
  await runMigrations()
}
