import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const roomsTable = pgTable("rooms", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  emoji: text("emoji").notNull().default("💬"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Room = typeof roomsTable.$inferSelect;
export type InsertRoom = typeof roomsTable.$inferInsert;
