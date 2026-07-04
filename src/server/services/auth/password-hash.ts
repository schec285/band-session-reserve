import { hash as argon2Hash, verify as argon2Verify } from "@node-rs/argon2";
import bcrypt from "bcryptjs";

// Algorithm は const enum のため isolatedModules 下でインポートできず、値(2 = Argon2id)を直接指定する
const ARGON2_ALGORITHM_ID = 2;

const ARGON2_OPTIONS = {
  algorithm: ARGON2_ALGORITHM_ID,
  memoryCost: 19456, // 19MiB（OWASP推奨値）
  timeCost: 3,
  parallelism: 1,
};

/**
 * 新規パスワードをArgon2idでハッシュ化する。
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2Hash(password, ARGON2_OPTIONS);
}

/**
 * 保存済みハッシュに対してパスワードを検証する。
 * Argon2id形式・bcrypt形式（移行期の既存ユーザー）の両方に対応し、
 * bcrypt形式での検証成功時は再ハッシュが必要であることを呼び出し元に伝える。
 */
export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<{ valid: boolean; needsRehash: boolean }> {
  if (storedHash.startsWith("$argon2id$")) {
    return { valid: await argon2Verify(storedHash, password), needsRehash: false };
  }
  const valid = await bcrypt.compare(password, storedHash);
  return { valid, needsRehash: valid };
}
