import { db } from "@/lib/db";
import { verificationTokens } from "@drizzle/schema";
import { eq, sql } from "drizzle-orm";
import type { IVerificationTokenRepository } from "./verification-token-repository";

/**
 * Drizzle ORM を使った認証トークンリポジトリの実装。
 */
export class DrizzleVerificationTokenRepository implements IVerificationTokenRepository {
  /**
   * IDで認証トークンを検索する。
   */
  async findById(id: string): Promise<{
    id: string;
    userId: string;
    codeHash: string | null;
    attempts: number;
    expiresAt: Date;
  } | null> {
    const [token] = await db
      .select({
        id: verificationTokens.id,
        userId: verificationTokens.userId,
        codeHash: verificationTokens.codeHash,
        attempts: verificationTokens.attempts,
        expiresAt: verificationTokens.expiresAt,
      })
      .from(verificationTokens)
      .where(eq(verificationTokens.id, id))
      .limit(1);
    return token ?? null;
  }

  /**
   * ユーザーIDで認証トークンを検索する。
   */
  async findByUserId(userId: string): Promise<{
    id: string;
    codeHash: string | null;
    attempts: number;
    expiresAt: Date;
  } | null> {
    const [token] = await db
      .select({
        id: verificationTokens.id,
        codeHash: verificationTokens.codeHash,
        attempts: verificationTokens.attempts,
        expiresAt: verificationTokens.expiresAt,
      })
      .from(verificationTokens)
      .where(eq(verificationTokens.userId, userId))
      .limit(1);
    return token ?? null;
  }

  /**
   * 認証トークンを新規作成する。
   */
  async create(data: { userId: string; codeHash: string | null; expiresAt: Date }): Promise<{ id: string }> {
    const [token] = await db
      .insert(verificationTokens)
      .values({
        userId: data.userId,
        codeHash: data.codeHash,
        expiresAt: data.expiresAt,
      })
      .returning({ id: verificationTokens.id });
    return token;
  }

  /**
   * 試行回数をインクリメントする。
   */
  async incrementAttempts(id: string): Promise<void> {
    await db
      .update(verificationTokens)
      .set({ attempts: sql`${verificationTokens.attempts} + 1` })
      .where(eq(verificationTokens.id, id));
  }

  /**
   * ユーザーIDに紐づく認証トークンを削除する。
   */
  async deleteByUserId(userId: string): Promise<void> {
    await db.delete(verificationTokens).where(eq(verificationTokens.userId, userId));
  }

  /**
   * IDに紐づく認証トークンを削除する。
   */
  async deleteById(id: string): Promise<void> {
    await db.delete(verificationTokens).where(eq(verificationTokens.id, id));
  }
}
