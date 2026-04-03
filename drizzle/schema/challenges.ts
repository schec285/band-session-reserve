import { pgTable, uuid, varchar } from "drizzle-orm/pg-core";

/**
 * 副作用を伴う操作に発行するチャレンジ。
 * 使用後は DELETE する。1ユーザー1件のみ保持（userId が PK）。
 */
export const challenges = pgTable("challenges", {
  userId: uuid("user_id").primaryKey(),
  id: uuid("id").notNull().unique().defaultRandom(),
  type: varchar("type", { length: 50 }).notNull(),
});
