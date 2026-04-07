import { NextResponse } from "next/server";
import { signUp } from "@/server/services/auth/signup";
import { DrizzleUserRepository } from "@/server/repositories/auth/user-repository.drizzle";

/**
 * ユーザー登録エンドポイント。
 * バリデーション後、メール/パスワードでユーザーを作成する。
 */
export async function POST(request: Request) {
  const body = await request.json();
  const { email, password, name } = body;

  const errors: { field: string; message: string }[] = [];
  if (!email) errors.push({ field: "email", message: "メールアドレスを入力してください" });
  if (!password) {
    errors.push({ field: "password", message: "パスワードを入力してください" });
  } else if (password.length < 8) {
    errors.push({ field: "password", message: "パスワードは8文字以上で入力してください" });
  }
  if (!name) errors.push({ field: "name", message: "名前を入力してください" });

  if (errors.length > 0) {
    return NextResponse.json({ message: "入力内容に誤りがあります", errors }, { status: 400 });
  }

  const userRepo = new DrizzleUserRepository();
  const result = await signUp(userRepo, { email, password, name });

  if (result.status === "duplicate") {
    return NextResponse.json({ message: "このメールアドレスはすでに登録されています" }, { status: 409 });
  }

  return NextResponse.json({ message: "ユーザー登録が完了しました" }, { status: 201 });
}
