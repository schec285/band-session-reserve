import { db } from "@/lib/db";
import { users } from "../../../../drizzle/schema";
import { eq } from "drizzle-orm";
import { IUserRepository } from "./user-repository";

/**
 * Drizzle ORM を使ったユーザーリポジトリの実装。
 */
export class DrizzleUserRepository implements IUserRepository {
  /**
   * メールアドレスでユーザーを検索する。
   */
  async findByEmail(email: string): Promise<{ id: string } | null> {
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    return user ?? null;
  }

  /**
   * ユーザーを新規作成する。
   */
  async create(data: { email: string; passwordHash: string; name: string }): Promise<void> {
    await db.insert(users).values({ email: data.email, passwordHash: data.passwordHash, name: data.name });
  }
}
