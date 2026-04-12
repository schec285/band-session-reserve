import bcrypt from "bcryptjs";
import type { IUserRepository } from "@/server/repositories/auth/user-repository";

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
 * のいずれかの場合は null を返す。
 */
export async function login(
  userRepo: IUserRepository,
  credentials: { email: string; password: string }
): Promise<LoginResult> {
  const user = await userRepo.findByEmailForAuth(credentials.email);
  if (!user || !user.passwordHash) return null;

  const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
  if (!isValid) return null;

  if (!user.emailVerified) return null;

  return { id: user.id, email: user.email, name: user.name, image: user.image, role: user.role };
}
