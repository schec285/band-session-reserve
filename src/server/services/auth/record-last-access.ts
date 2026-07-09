import type { IUserRepository } from "@/server/repositories/auth/user-repository";
import { todayJSTDateString } from "@/lib/utils/date";

/**
 * 最終アクセス日を記録する。
 * 渡されたCookieの日付が今日のJST日付と異なる場合のみDBを更新し、更新後にCookieへセットすべき値を返す。
 * 同日中の再アクセスではDBを更新せず null を返す。
 */
export async function recordLastAccess(
  repo: IUserRepository,
  userId: string,
  cookieDate: string | undefined,
  now: Date
): Promise<{ cookieValue: string } | null> {
  const today = todayJSTDateString(now);
  if (cookieDate === today) return null;

  await repo.updateLastAccessDate(userId, today);
  return { cookieValue: today };
}
