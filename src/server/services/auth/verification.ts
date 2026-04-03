import type { IVerificationRepository } from "@/server/repositories/auth/verification-repository";

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
