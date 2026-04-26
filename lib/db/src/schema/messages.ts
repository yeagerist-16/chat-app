import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { roomsTable } from "./rooms";
import { usersTable } from "./users";

export const messagesTable = pgTable(
  "messages",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    roomId: text("room_id")
      .notNull()
      .references(() => roomsTable.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("messages_room_created_idx").on(table.roomId, table.createdAt),
    index("messages_created_idx").on(table.createdAt),
  ],
);

export type Message = typeof messagesTable.$inferSelect;
export type InsertMessage = typeof messagesTable.$inferInsert;
