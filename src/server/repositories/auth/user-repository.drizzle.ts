import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "../../../../drizzle/schema";
import type { IUserRecord, IUserRepository } from "./user-repository";

/**
 * Drizzle ORM を使った IUserRepository の実装。
 */
export class DrizzleUserRepository implements IUserRepository {
  /**
   * ユーザー名でユーザーを検索する。
   * 存在しない場合は null を返す。
   */
  async findByUsername(username: string): Promise<IUserRecord | null> {
    const rows = await db.select().from(users).where(eq(users.username, username));
    return rows[0] ?? null;
  }

  /**
   * メールアドレスでユーザーを検索する。
   * 存在しない場合は null を返す。
   */
  async findByEmail(email: string): Promise<IUserRecord | null> {
    const rows = await db.select().from(users).where(eq(users.email, email));
    return rows[0] ?? null;
  }

  /**
   * 新規ユーザーをDBに作成する。
   */
  async create(data: { username: string; email: string; passwordHash: string; createdAt: Date; updatedAt: Date }): Promise<void> {
    await db.insert(users).values(data);
  }

  /**
   * ユーザーの emailVerifiedAt を現在日時で更新し、有効化する。
   */
  async activateUser(userId: string): Promise<void> {
    await db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, userId));
  }

  /**
   * ユーザーのパスワードハッシュを更新する。
   */
  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
  }
}
