import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getProfile, updateProfile } from "@/server/services/user/profile";
import { DrizzleUserRepository } from "@/server/repositories/auth/user-repository.drizzle";
import { UpdateProfileSchema } from "@/lib/types/api/user";
import type { ErrorResponse } from "@/lib/types/api";
import type { GetProfileResponse } from "@/lib/types/api/user";
import { withApiHandler } from "@/lib/api/error-handler";

/**
 * ログイン中ユーザーのプロフィール取得エンドポイント。
 */
export async function GET(_request: Request) {
  return withApiHandler(async () => {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "認証が必要です" } satisfies ErrorResponse, { status: 401 });
    }

    const repo = new DrizzleUserRepository();
    const profile = await getProfile(repo, session.user.id);

    if (!profile) {
      return NextResponse.json({ message: "ユーザーが見つかりません" } satisfies ErrorResponse, { status: 404 });
    }

    return NextResponse.json(profile satisfies GetProfileResponse);
  });
}

/**
 * ログイン中ユーザーのプロフィール更新エンドポイント。
 */
export async function PUT(request: Request) {
  return withApiHandler(async () => {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "認証が必要です" } satisfies ErrorResponse, { status: 401 });
    }

    const body = await request.json();
    const parsed = UpdateProfileSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.issues.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      return NextResponse.json({ message: "入力内容に誤りがあります", errors } satisfies ErrorResponse, { status: 400 });
    }

    const repo = new DrizzleUserRepository();
    await updateProfile(repo, session.user.id, parsed.data);

    return NextResponse.json({ message: "プロフィールを更新しました" } satisfies ErrorResponse);
  });
}
