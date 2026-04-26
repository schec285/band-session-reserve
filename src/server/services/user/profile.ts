import type { IUserRepository } from "@/server/repositories/auth/user-repository";
import type { GetProfileResponse, UpdateProfileInput } from "@/lib/types/api/user";

/**
 * ログイン中ユーザーのプロフィール情報を取得する。
 * ユーザーが存在しない場合は null を返す。
 */
export async function getProfile(
  repo: IUserRepository,
  userId: string
): Promise<GetProfileResponse | null> {
  return repo.getProfile(userId);
}

/**
 * ログイン中ユーザーのプロフィール情報を更新する。
 */
export async function updateProfile(
  repo: IUserRepository,
  userId: string,
  input: UpdateProfileInput
): Promise<void> {
  await repo.updateProfile(userId, {
    name: input.name,
    part: input.part,
    comment: input.comment,
  });
}
