import bcrypt from "bcryptjs";
import type { IUserRepository } from "@/lib/auth/repository/user-repository";

const SALT_ROUNDS = 12;

export type AuthenticateResult =
  | { status: "ok"; user: { id: string; role: string } }
  | { status: "not-found" }
  | { status: "wrong-password" }
  | { status: "unverified" };

/**
 * ユーザー名でユーザーを検索し、存在すれば返す。
 */
export async function findUserByUsername(
  repo: IUserRepository,
  username: string
) {
  return repo.findByUsername(username);
}

/**
 * メールアドレスでユーザーを検索し、存在すれば返す。
 */
export async function findUserByEmail(repo: IUserRepository, email: string) {
  return repo.findByEmail(email);
}

/**
 * パスワードをハッシュ化してユーザーを新規作成する。
 */
export async function createUser(
  repo: IUserRepository,
  data: { username: string; email: string; password: string }
): Promise<void> {
  const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
  const now = new Date();
  await repo.create({ username: data.username, email: data.email, passwordHash, createdAt: now, updatedAt: now });
}

/**
 * メールアドレスとパスワードでユーザーを認証する。
 * 認証結果をステータスとして返す。
 */
export async function authenticateUser(
  repo: IUserRepository,
  email: string,
  password: string
): Promise<AuthenticateResult> {
  const user = await repo.findByEmail(email);
  if (!user) return { status: "not-found" };

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) return { status: "wrong-password" };

  if (!user.emailVerifiedAt) return { status: "unverified" };

  return { status: "ok", user: { id: user.id, role: user.role } };
}
