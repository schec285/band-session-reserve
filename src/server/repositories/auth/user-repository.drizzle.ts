import { db } from "@/lib/db";
import { users, Part } from "@drizzle/schema";
import { desc, eq } from "drizzle-orm";
import { IUserRepository, IUserListRecord } from "./user-repository";

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
   * 認証用にIDでユーザーを検索する。
   */
  async findByIdForAuth(id: string): Promise<{
    id: string;
    email: string;
    name: string | null;
    passwordHash: string | null;
  } | null> {
    const [user] = await db
      .select({ id: users.id, email: users.email, name: users.name, passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.id, id))
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
   * パスワードハッシュを更新する。
   */
  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, id));
  }

  /**
   * 最終アクセス日（YYYY-MM-DD）をセットする。
   */
  async updateLastAccessDate(id: string, dateString: string): Promise<void> {
    await db.update(users).set({ lastAccessDate: dateString }).where(eq(users.id, id));
  }

  /**
   * プロフィール情報（メール・名前・パート・コメント）を取得する。
   */
  async getProfile(id: string): Promise<{ email: string; name: string; part: string | null; comment: string | null } | null> {
    const [user] = await db
      .select({ email: users.email, name: users.name, part: users.part, comment: users.comment })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return user ?? null;
  }

  /**
   * プロフィール情報（名前・パート・コメント）を更新する。
   */
  async updateProfile(id: string, data: { name?: string; part?: Part | null; comment?: string | null }): Promise<void> {
    await db.update(users).set({ ...data, updatedAt: new Date() }).where(eq(users.id, id));
  }

  /**
   * 全ユーザーを登録日時の降順で取得する。
   */
  async findAll(): Promise<IUserListRecord[]> {
    return await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        emailVerified: users.emailVerified,
        createdAt: users.createdAt,
        lastAccessDate: users.lastAccessDate,
      })
      .from(users)
      .orderBy(desc(users.createdAt));
  }

  /**
   * ロールを更新する。存在しない場合は null を返す。
   */
  async updateRole(id: string, role: string): Promise<IUserListRecord | null> {
    const [user] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        emailVerified: users.emailVerified,
        createdAt: users.createdAt,
        lastAccessDate: users.lastAccessDate,
      });
    return user ?? null;
  }

  /**
   * JWT再取得用に名前とロールを取得する。
   */
  async getAuthRefreshData(id: string): Promise<{ name: string; role: string } | null> {
    const [user] = await db
      .select({ name: users.name, role: users.role })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return user ?? null;
  }
}
