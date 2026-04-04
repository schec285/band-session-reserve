import type { IVerificationRepository } from "@/server/repositories/auth/verification-repository";

/**
 * 認証コードをDBに保存する。
 * userId は未認証ユーザー（register フロー）では null になる場合がある。
 */
export async function saveCode(
  repo: IVerificationRepository,
  sessionId: string,
  userId: string | null,
  code: string,
  expiresAt: Date
): Promise<void> {
  await repo.save(sessionId, userId, code, expiresAt);
}

/**
 * セッションIDと認証コードを照合する。
 * valid / invalid / expired のいずれかを返す。
 */
export async function validateCode(
  repo: IVerificationRepository,
  sessionId: string,
  code: string
): Promise<"valid" | "invalid" | "expired"> {
  const record = await repo.findBySessionId(sessionId);
  if (!record) return "invalid";
  if (record.expiresAt < new Date()) return "expired";
  if (record.code !== code) return "invalid";
  return "valid";
}
