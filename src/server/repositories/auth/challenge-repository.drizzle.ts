import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { challenges } from "../../../../drizzle/schema";
import type { IChallengeRecord, IChallengeRepository } from "./challenge-repository";

/**
 * Drizzle ORM を使った IChallengeRepository の実装。
 */
export class DrizzleChallengeRepository implements IChallengeRepository {
  /**
   * チャレンジをDBに保存する。
   * 1セッション1件のみ保持するため、sessionId が PK となる。
   */
  async save(sessionId: string, challengeId: string, type: string): Promise<void> {
    await db.insert(challenges).values({ sessionId, id: challengeId, type });
  }

  /**
   * セッションIDでチャレンジを取得する。
   * 存在しない場合は null を返す。
   */
  async findBySessionId(sessionId: string): Promise<IChallengeRecord | null> {
    const rows = await db
      .select({ id: challenges.id, type: challenges.type })
      .from(challenges)
      .where(eq(challenges.sessionId, sessionId));
    return rows[0] ?? null;
  }

  /**
   * セッションIDに紐づくチャレンジをDBから削除する。
   */
  async deleteBySessionId(sessionId: string): Promise<void> {
    await db.delete(challenges).where(eq(challenges.sessionId, sessionId));
  }
}
