import type { IUserRepository } from "@/server/repositories/auth/user-repository";

/**
 * JWT再取得のために、DBから最新の名前とロールを取得する。
 * ユーザーが存在しない場合は null を返す。
 */
export async function refreshTokenData(
  repo: IUserRepository,
  userId: string
): Promise<{ name: string; role: string } | null> {
  return repo.getAuthRefreshData(userId);
}
