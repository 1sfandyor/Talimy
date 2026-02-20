import { boolean, index, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core"
import { tenants } from "./tenants"
import { users } from "./users"

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    receiverId: uuid("receiver_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    subject: varchar("subject", { length: 255 }),
    body: varchar("body", { length: 5000 }).notNull(),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    tenantIdx: index("messages_tenant_id_idx").on(table.tenantId),
    senderIdx: index("messages_sender_id_idx").on(table.senderId),
    receiverIdx: index("messages_receiver_id_idx").on(table.receiverId),
    readIdx: index("messages_is_read_idx").on(table.isRead),
  })
)
