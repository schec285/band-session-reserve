import { NextResponse } from "next/server";
import { validateCsrfToken } from "@/server/services/csrf/csrf";
import { validateChallenge } from "@/server/services/auth/challenge";
import { validateCode } from "@/server/services/auth/verification";
import { updatePassword } from "@/server/services/auth/user";
import { DrizzleChallengeRepository } from "@/server/repositories/auth/challenge-repository.drizzle";
import { DrizzleVerificationRepository } from "@/server/repositories/auth/verification-repository.drizzle";
import { DrizzleUserRepository } from "@/server/repositories/auth/user-repository.drizzle";

/**
 * パスワードリセットエンドポイント。
 * X-Challenge-Token ヘッダーのチャレンジと認証コードを検証し、パスワードを更新する。
 */
export async function POST(request: Request) {
  if (!validateCsrfToken(request)) {
    return NextResponse.json({ success: false, message: "CSRFトークンが無効です" }, { status: 403 });
  }

  const challengeToken = request.headers.get("X-Challenge-Token") ?? "";
  const lastColon = challengeToken.lastIndexOf(":");
  const sessionId = challengeToken.substring(0, lastColon);
  const nonce = challengeToken.substring(lastColon + 1);

  const body = await request.json();
  const { code, password } = body;

  if (!code) {
    return NextResponse.json({ success: false, message: "認証コードは必須です" }, { status: 400 });
  }
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ success: false, message: "認証コードは6桁の数字で入力してください" }, { status: 400 });
  }
  if (!password) {
    return NextResponse.json({ success: false, message: "パスワードは必須です" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { success: false, message: "パスワードは12文字以上で、大文字・数字・記号を各1文字以上含めてください" },
      { status: 400 }
    );
  }

  const challengeRepo = new DrizzleChallengeRepository();
  const verificationRepo = new DrizzleVerificationRepository();
  const userRepo = new DrizzleUserRepository();

  const challengeValid = await validateChallenge(challengeRepo, sessionId, nonce);
  if (!challengeValid) {
    return NextResponse.json({ success: false, message: "操作が無効です。最初からやり直してください" }, { status: 401 });
  }

  const result = await validateCode(verificationRepo, sessionId, code);
  if (result === "expired") {
    return NextResponse.json(
      { success: false, message: "認証コードの有効期限が切れています。再度パスワードリセットを申請してください" },
      { status: 408 }
    );
  }
  if (result === "invalid") {
    return NextResponse.json({ success: false, message: "認証コードが正しくありません" }, { status: 401 });
  }

  await updatePassword(verificationRepo, userRepo, sessionId, password);

  return NextResponse.json({
    success: true,
    message: "パスワードを再設定しました。新しいパスワードでログインしてください",
  });
}
