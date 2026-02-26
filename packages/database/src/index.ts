import { drizzle } from "drizzle-orm/node-postgres"
import { pool } from "./client"
import * as schema from "./schema"

export const db = drizzle(pool, { schema })

export type Database = typeof db

export * from "./client"
export * from "./relations"
export * from "./schema"
