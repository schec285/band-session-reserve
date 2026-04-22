import { db } from "@/lib/db";
import { users } from "@drizzle/schema";
import { eq } from "drizzle-orm";
import { IUserRepository } from "./user-repository";

/**
 * Drizzle ORM を使ったユーザーリポジトリの実装。
 */
export class DrizzleUserRepository implements IUserRepository {
  /**
   * メールアドレスでユーザーを検索する。
   */
  async findByEmail(email: string): Promise<{ id: string; name: string; emailVerified: Date | null } | null> {
    const [user] = await db
      .select({ id: users.id, name: users.name, emailVerified: users.emailVerified })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return user ? { id: user.id, name: user.name ?? "", emailVerified: user.emailVerified } : null;
  }

  /**
   * IDでユーザーを検索する。
   */
  async findById(id: string): Promise<{ id: string; email: string; name: string } | null> {
    const [user] = await db
      .select({ id: users.id, email: users.email, name: users.name })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return user ? { id: user.id, email: user.email, name: user.name ?? "" } : null;
  }

  /**
   * 認証用にメールアドレスでユーザーを検索する。
   */
  async findByEmailForAuth(email: string): Promise<{
    id: string;
    email: string;
    name: string | null;
    image: string | null;
    role: string;
    passwordHash: string | null;
    emailVerified: Date | null;
  } | null> {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        image: users.image,
        role: users.role,
        passwordHash: users.passwordHash,
        emailVerified: users.emailVerified,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return user ?? null;
  }

  /**
   * ユーザーを新規作成する。
   */
  async create(data: { email: string; passwordHash: string; name: string }): Promise<{ id: string }> {
    const [user] = await db
      .insert(users)
      .values({ email: data.email, passwordHash: data.passwordHash, name: data.name })
      .returning({ id: users.id });
    return user;
  }

  /**
   * 名前とパスワードハッシュを更新する。
   */
  async update(id: string, data: { passwordHash: string; name: string }): Promise<void> {
    await db.update(users).set({ passwordHash: data.passwordHash, name: data.name }).where(eq(users.id, id));
  }

  /**
   * email_verified を現在時刻でセットする。
   */
  async setEmailVerified(id: string): Promise<void> {
    await db.update(users).set({ emailVerified: new Date() }).where(eq(users.id, id));
  }

  /**
   * パスワードハッシュのみを更新する。
   */
  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await db.update(users).set({ passwordHash }).where(eq(users.id, id));
  }
}
