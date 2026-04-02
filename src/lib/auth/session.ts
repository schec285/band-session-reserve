import { randomUUID } from "crypto";
import type { ISessionRepository } from "./repository/session-repository";

/**
 * 新しいセッションを作成しトークンを返す。
 * ログイン成功時に呼び出し、セッションクッキーとして発行する。
 */
export async function createSession(repo: ISessionRepository, userId: string): Promise<string> {
  const token = randomUUID();
  await repo.save(token, userId);
  return token;
}

/**
 * リクエストのセッションクッキーを検証しセッション情報を返す。
 * 無効または存在しない場合は null を返す。
 */
export async function getSession(repo: ISessionRepository, request: Request): Promise<{ userId: string } | null> {
  const cookie = request.headers.get("Cookie");
  if (!cookie) return null;
  const match = cookie.match(/session=([^;]+)/);
  if (!match) return null;
  return repo.findByToken(match[1]);
}

/**
 * セッションをDBから削除する。
 * ログアウト時に呼び出す。
 */
export async function invalidateSession(repo: ISessionRepository, sessionToken: string): Promise<void> {
  await repo.deleteByToken(sessionToken);
}
