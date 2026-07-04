import { hash as argon2Hash, verify as argon2Verify } from "@node-rs/argon2";
// TODO: bcrypt移行期コードの削除手順（全ユーザーのpasswordHashがArgon2id形式に
// 置き換わったこと＝DB上にbcrypt形式（$2a$/$2b$等で始まる）のハッシュが
// 存在しないことを確認できたら、以下を全て実施する）
// 1. このimportと下記 verifyPassword() 内のbcrypt分岐を削除する
// 2. src/server/services/auth/login.ts の needsRehash による上書きブロックを削除する
// 3. src/tests/services/auth/password-hash.test.ts のbcryptを使うテスト2件を削除する
// 4. src/tests/services/auth/login.test.ts のbcryptハッシュ移行テスト1件を削除し、
//    残る2件（bcryptを単なるハッシュ生成の便宜で使っているだけのテスト）は
//    hashPassword() を使うよう書き換える
// 5. `npm uninstall bcryptjs` を実行し package.json / package-lock.json から除去する
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

  // ↓ ここから移行期のみ必要なbcrypt互換コード（旧アルゴリズム判定箇所）。
  // 全ユーザーのpasswordHashがArgon2id形式に置き換わったら、この分岐と
  // needsRehashの概念自体・上記ifブロックの早期returnを削除し、
  // 常にargon2Verifyを呼ぶだけの実装にできる。
  const valid = await bcrypt.compare(password, storedHash);
  return { valid, needsRehash: valid };
  // ↑ ここまで削除可能
}
