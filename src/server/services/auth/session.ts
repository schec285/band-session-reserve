import { randomBytes, createHash } from "crypto";
import type { ISessionRepository } from "@/server/repositories/auth/session-repository";

/**
 * セッショントークンを SHA-256 でハッシュ化して返す。
 * DBにはハッシュ値を保存し、クッキーには生トークンを発行する。
 */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * 新しいセッションを作成しトークンを返す。
 * DBにはトークンのハッシュを保存する。
 * ログイン成功時に呼び出し、セッションクッキーとして発行する。
 */
export async function createSession(repo: ISessionRepository, userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  await repo.save(hashToken(token), userId);
  return token;
}

/**
 * リクエストのセッションクッキーを検証しセッション情報を返す。
 * クッキーのトークンをハッシュ化してDBと照合する。
 * 無効または存在しない場合は null を返す。
 */
export async function getSession(repo: ISessionRepository, request: Request): Promise<{ userId: string } | null> {
  const cookie = request.headers.get("Cookie");
  if (!cookie) return null;
  const match = cookie.match(/session=([^;]+)/);
  if (!match) return null;
  return repo.findByToken(hashToken(match[1]));
}

/**
 * セッションをDBから削除する。
 * トークンをハッシュ化してDBと照合し削除する。
 * ログアウト時に呼び出す。
 */
export async function invalidateSession(repo: ISessionRepository, sessionToken: string): Promise<void> {
  await repo.deleteByToken(hashToken(sessionToken));
}
