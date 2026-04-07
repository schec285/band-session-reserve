import bcrypt from "bcryptjs";
import { IUserRepository } from "@/server/repositories/auth/user-repository";

const SALT_ROUNDS = 10;

type SignUpResult = { status: "ok" } | { status: "duplicate" };

/**
 * ユーザー登録を行う。
 * メールアドレスの重複チェック後、パスワードをハッシュ化してユーザーを作成する。
 */
export async function signUp(
  userRepo: IUserRepository,
  data: { email: string; password: string; name: string }
): Promise<SignUpResult> {
  const existing = await userRepo.findByEmail(data.email);
  if (existing) return { status: "duplicate" };

  const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
  await userRepo.create({ email: data.email, passwordHash, name: data.name });

  return { status: "ok" };
}
