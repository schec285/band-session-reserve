import { pgTable, uuid, timestamp } from "drizzle-orm/pg-core";

/**
 * ログインセッション。
 * ログアウト時に DELETE する。
 */
export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
