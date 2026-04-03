import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { sessions } from "../../../../drizzle/schema";
import type { ISessionRepository } from "./session-repository";

/**
 * Drizzle ORM を使った ISessionRepository の実装。
 * sessions テーブルの id カラムをセッショントークンとして使用する。
 */
export class DrizzleSessionRepository implements ISessionRepository {
  /**
   * セッションをDBに保存する。
   * token を sessions.id として挿入する。
   */
  async save(token: string, userId: string): Promise<void> {
    await db.insert(sessions).values({ id: token, userId });
  }

  /**
   * セッショントークンからセッションを取得する。
   * 存在しない場合は null を返す。
   */
  async findByToken(token: string): Promise<{ userId: string } | null> {
    const rows = await db.select({ userId: sessions.userId }).from(sessions).where(eq(sessions.id, token));
    return rows[0] ?? null;
  }

  /**
   * セッショントークンに紐づくセッションをDBから削除する。
   */
  async deleteByToken(token: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.id, token));
  }
}
