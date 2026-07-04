import type { IUserRepository } from "@/server/repositories/auth/user-repository";
import { hashPassword, verifyPassword } from "@/server/services/auth/password-hash";

type LoginResult = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: string;
} | null;

/**
 * メール/パスワードでユーザーを認証する。
 * passwordHash が null（OAuthユーザー）・パスワード不一致・emailVerified が null（未認証）
 * のいずれかの場合は null を返す。認証に成功した場合は最終ログイン日時を更新する。
 * bcrypt形式の既存ハッシュ（移行期のユーザー）で認証に成功した場合はArgon2idへ遅延リハッシュする。
 */
export async function login(
  userRepo: IUserRepository,
  credentials: { email: string; password: string }
): Promise<LoginResult> {
  const user = await userRepo.findByEmailForAuth(credentials.email);
  if (!user || !user.passwordHash) return null;

  const { valid, needsRehash } = await verifyPassword(credentials.password, user.passwordHash);
  if (!valid) return null;

  if (!user.emailVerified) return null;

  await userRepo.updateLastLogin(user.id);

  if (needsRehash) {
    const newHash = await hashPassword(credentials.password);
    await userRepo.updatePassword(user.id, newHash);
  }

  return { id: user.id, email: user.email, name: user.name, image: user.image, role: user.role };
}
