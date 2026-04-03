import { pgTable, uuid, varchar } from "drizzle-orm/pg-core";

/**
 * メール認証前の仮登録ユーザー。
 * 認証完了後に users テーブルへ移行し、このレコードは削除する。
 */
export const pendingUsers = pgTable("pending_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  username: varchar("username", { length: 100 }).notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
});
