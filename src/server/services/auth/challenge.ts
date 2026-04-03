import { randomUUID } from "crypto";
import type { IChallengeRepository } from "@/server/repositories/auth/challenge-repository";

/**
 * ランダムなnonce文字列（チャレンジ）を生成してDBに保存し、返す。
 * sessionId をキーに保存し、type で操作の種別を管理する。
 */
export async function generateChallenge(
  repo: IChallengeRepository,
  sessionId: string,
  type: string
): Promise<string> {
  const challengeId = randomUUID();
  await repo.save(sessionId, challengeId, type);
  return challengeId;
}

/**
 * チャレンジの正当性を検証する。
 * sessionId に紐づくチャレンジが存在し、nonce が一致すれば削除して true を返す。
 */
export async function validateChallenge(
  repo: IChallengeRepository,
  sessionId: string,
  challengeNonce: string
): Promise<boolean> {
  const record = await repo.findBySessionId(sessionId);
  if (!record) return false;
  if (record.id !== challengeNonce) return false;
  await repo.deleteBySessionId(sessionId);
  return true;
}
