import bcrypt from "bcryptjs";
import type { IUserRepository } from "@/server/repositories/auth/user-repository";
import type { IVerificationRepository } from "@/server/repositories/auth/verification-repository";

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

/**
 * メールアドレス認証を完了し、ユーザーを有効化する。
 * 認証コードレコードを削除してからユーザーの emailVerifiedAt を更新する。
 */
export async function activateUser(
  verificationRepo: IVerificationRepository,
  userRepo: IUserRepository,
  sessionId: string
): Promise<void> {
  const record = await verificationRepo.findBySessionId(sessionId);
  if (!record) throw new Error("verification record not found");
  await verificationRepo.deleteBySessionId(sessionId);
  await userRepo.activateUser(record.userId);
}

/**
 * パスワードをリセットする。
 * 認証コードレコードを削除してから新しいパスワードハッシュを保存する。
 */
export async function updatePassword(
  verificationRepo: IVerificationRepository,
  userRepo: IUserRepository,
  sessionId: string,
  newPassword: string
): Promise<void> {
  const record = await verificationRepo.findBySessionId(sessionId);
  if (!record) throw new Error("verification record not found");
  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await verificationRepo.deleteBySessionId(sessionId);
  await userRepo.updatePassword(record.userId, passwordHash);
}
