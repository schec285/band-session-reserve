import { pgTable, varchar, uuid, timestamp } from "drizzle-orm/pg-core";

/**
 * 認証済みセッション。
 * ログイン時に発行（再発行）、ログアウト時に DELETE する。
 * id にはセッショントークンの SHA-256 ハッシュ（hex）を保存する。
 */
export const sessions = pgTable("sessions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: uuid("user_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
