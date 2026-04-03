import { pgTable, uuid, varchar, timestamp } from "drizzle-orm/pg-core";

/**
 * チャレンジに紐づく認証コード（6桁）。
 * 使用後は DELETE する。1ユーザー1件のみ保持（userId が PK）。
 */
export const verificationCodes = pgTable("verification_codes", {
  userId: uuid("user_id").primaryKey(),
  code: varchar("code", { length: 6 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});
