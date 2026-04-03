import { pgTable, uuid, timestamp } from "drizzle-orm/pg-core";

/**
 * 認証済みセッション。
 * ログイン時に発行（再発行）、ログアウト時に DELETE する。
 */
export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
