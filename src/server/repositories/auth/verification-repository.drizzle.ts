import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { verificationCodes } from "../../../../drizzle/schema";
import type { IVerificationCodeRecord, IVerificationRepository } from "./verification-repository";

/**
 * Drizzle ORM を使った IVerificationRepository の実装。
 */
export class DrizzleVerificationRepository implements IVerificationRepository {
  /**
   * 認証コードをDBに保存する。
   * 1セッション1件のみ保持するため、sessionId が PK となる。
   */
  async save(sessionId: string, userId: string | null, code: string, expiresAt: Date): Promise<void> {
    await db.insert(verificationCodes).values({ sessionId, userId, code, expiresAt });
  }

  /**
   * セッションIDで認証コードレコードを取得する。
   * 存在しない場合は null を返す。
   */
  async findBySessionId(sessionId: string): Promise<IVerificationCodeRecord | null> {
    const rows = await db
      .select({ userId: verificationCodes.userId, code: verificationCodes.code, expiresAt: verificationCodes.expiresAt })
      .from(verificationCodes)
      .where(eq(verificationCodes.sessionId, sessionId));
    return rows[0] ?? null;
  }

  /**
   * セッションIDに紐づく認証コードレコードをDBから削除する。
   */
  async deleteBySessionId(sessionId: string): Promise<void> {
    await db.delete(verificationCodes).where(eq(verificationCodes.sessionId, sessionId));
  }
}
