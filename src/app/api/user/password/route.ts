import { NextResponse } from "next/server";
import { Resend } from "resend";
import { auth } from "@/auth";
import { changePassword } from "@/server/services/user/password";
import { DrizzleUserRepository } from "@/server/repositories/auth/user-repository.drizzle";
import { ResendEmailService } from "@/server/services/email/auth/email-service.resend";
import { ChangePasswordSchema } from "@/lib/types/api/user";
import type { ErrorResponse } from "@/lib/types/api";
import { withApiHandler } from "@/lib/api/error-handler";

/**
 * ログイン中ユーザーのパスワード変更エンドポイント。
 */
export async function PUT(request: Request) {
  return withApiHandler(async () => {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "認証が必要です" } satisfies ErrorResponse, { status: 401 });
    }

    const body = await request.json();
    const parsed = ChangePasswordSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.issues.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      return NextResponse.json({ message: "入力内容に誤りがあります", errors } satisfies ErrorResponse, { status: 400 });
    }

    const repo = new DrizzleUserRepository();
    const emailService = new ResendEmailService(new Resend(process.env.RESEND_API_KEY));
    const result = await changePassword(repo, emailService, session.user.id, {
      currentPassword: parsed.data.currentPassword,
      newPassword: parsed.data.newPassword,
    });

    if (result.status === "error") {
      if (result.reason === "user_not_found") {
        return NextResponse.json({ message: "ユーザーが見つかりません" } satisfies ErrorResponse, { status: 404 });
      }
      if (result.reason === "no_password") {
        return NextResponse.json(
          { message: "このアカウントはパスワードが設定されていません" } satisfies ErrorResponse,
          { status: 400 }
        );
      }
      return NextResponse.json(
        {
          message: "現在のパスワードが正しくありません",
          errors: [{ field: "currentPassword", message: "現在のパスワードが正しくありません" }],
        } satisfies ErrorResponse,
        { status: 400 }
      );
    }

    return NextResponse.json({ message: "パスワードを変更しました" } satisfies ErrorResponse);
  });
}
