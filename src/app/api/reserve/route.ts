import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createReservations } from "@/server/services/reserve/reservation";
import { DrizzleReservationRepository } from "@/server/repositories/reserve/reservation-repository.drizzle";
import { CreateReservationsSchema } from "@/lib/types/api/reserve";
import type { ErrorResponse } from "@/lib/types/api";
import { withApiHandler } from "@/lib/api/error-handler";

/**
 * 予約一括作成エンドポイント。
 * 1件以上のエントリーを受け取り、全件成功した場合のみ保存する。
 * いずれか1件でも失敗した場合は全件キャンセルする。
 */
export async function POST(request: Request) {
  return withApiHandler(async () => {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "認証が必要です" } satisfies ErrorResponse, { status: 401 });
    }

    const body = await request.json();
    const parsed = CreateReservationsSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.issues.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      return NextResponse.json({ message: "入力内容に誤りがあります", errors } satisfies ErrorResponse, { status: 400 });
    }

    const repo = new DrizzleReservationRepository();
    const result = await createReservations(repo, {
      userId: session.user.id,
      entries: parsed.data.entries,
      snsConsent: parsed.data.snsConsent,
      comment: parsed.data.comment,
    });

    if (result.status === "not-found") {
      return NextResponse.json({ message: "イベント曲が見つかりません" } satisfies ErrorResponse, { status: 404 });
    }
    if (result.status === "filled") {
      return NextResponse.json(
        { message: "このパートはすでに埋まっています", errors: [{ field: "part", message: "このパートはすでに埋まっています" }] } satisfies ErrorResponse,
        { status: 409 }
      );
    }
    if (result.status === "closed") {
      return NextResponse.json({ message: "このイベントの受付は終了しています" } satisfies ErrorResponse, { status: 422 });
    }
    if (result.status === "forbidden-combination") {
      return NextResponse.json(
        { message: "同じ曲で登録できないパートの組み合わせです", errors: [{ field: "part", message: "同じ曲で登録できないパートの組み合わせです" }] } satisfies ErrorResponse,
        { status: 422 }
      );
    }
    if (result.status === "entry-limit-exceeded") {
      return NextResponse.json(
        { message: "エントリー数の上限に達しています" } satisfies ErrorResponse,
        { status: 422 }
      );
    }

    return NextResponse.json({ message: "予約を受け付けました！セッションでお待ちしています 🎵" } satisfies ErrorResponse);
  });
}
