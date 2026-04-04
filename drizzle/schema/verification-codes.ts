import { pgTable, uuid, varchar, timestamp } from "drizzle-orm/pg-core";

/**
 * チャレンジに紐づく認証コード（6桁）。
 * 使用後は DELETE する。1セッション1件のみ保持（sessionId が PK）。
 */
export const verificationCodes = pgTable("verification_codes", {
  sessionId: uuid("session_id").primaryKey(),
  userId: uuid("user_id"),
  code: varchar("code", { length: 6 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});
