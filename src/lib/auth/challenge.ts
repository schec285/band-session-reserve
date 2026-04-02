import { randomUUID } from "crypto";
import type { IChallengeRepository } from "./repository/challenge-repository";

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

/**
 * ランダムなnonce文字列（チャレンジ）を生成してDBに保存し、返す。
 */
export async function generateChallenge(repo: IChallengeRepository): Promise<string> {
  const challenge = randomUUID();
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS);
  await repo.save(challenge, expiresAt);
  return challenge;
}

/**
 * チャレンジの正当性を検証する。
 * DBに存在し、有効期限内かつ未使用であれば true を返す。
 */
export async function validateChallenge(repo: IChallengeRepository, challenge: string): Promise<boolean> {
  const record = await repo.findByChallenge(challenge);
  if (!record) return false;
  if (record.usedAt !== null) return false;
  if (record.expiresAt < new Date()) return false;
  await repo.markAsUsed(challenge);
  return true;
}
