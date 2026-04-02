import bcrypt from "bcryptjs";
import type { IVerificationRepository } from "@/server/repositories/auth/verification-repository";

/**
 * メールアドレス確認用の認証コードを検証する。
 * チャレンジに紐づくコードと照合し、valid / invalid / expired を返す。
 */
export async function validateVerificationCode(
  repo: IVerificationRepository,
  challenge: string,
  code: string
): Promise<"valid" | "invalid" | "expired"> {
  const record = await repo.findCode(challenge);
  if (!record) return "invalid";
  if (record.expiresAt < new Date()) return "expired";
  if (record.usedAt !== null) return "invalid";
  if (record.code !== code) return "invalid";
  return "valid";
}

/**
 * ユーザーのメールアドレスを有効化する。
 * チャレンジからユーザーを特定し、emailVerified フラグを立てる。
 */
export async function activateUser(
  repo: IVerificationRepository,
  challenge: string
): Promise<void> {
  const record = await repo.findCode(challenge);
  if (!record) throw new Error("challenge not found");
  await repo.markCodeAsUsed(challenge);
  await repo.activateUser(record.userId);
}

/**
 * パスワードリセット用の認証コードを検証する。
 * チャレンジに紐づくコードと照合し、valid / invalid / expired を返す。
 */
export async function validatePasswordResetCode(
  repo: IVerificationRepository,
  challenge: string,
  code: string
): Promise<"valid" | "invalid" | "expired"> {
  const record = await repo.findCode(challenge);
  if (!record) return "invalid";
  if (record.expiresAt < new Date()) return "expired";
  if (record.usedAt !== null) return "invalid";
  if (record.code !== code) return "invalid";
  return "valid";
}

/**
 * ユーザーのパスワードを更新する。
 * チャレンジからユーザーを特定し、新しいパスワードハッシュを保存する。
 */
export async function updatePassword(
  repo: IVerificationRepository,
  challenge: string,
  newPassword: string
): Promise<void> {
  const record = await repo.findCode(challenge);
  if (!record) throw new Error("challenge not found");
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await repo.markCodeAsUsed(challenge);
  await repo.updateUserPassword(record.userId, passwordHash);
}
