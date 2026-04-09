import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { updateReservationPart, cancelReservation } from "@/server/services/reserve/reservation";
import { DrizzleReservationRepository } from "@/server/repositories/reserve/reservation-repository.drizzle";
import { UpdateReservationPartSchema } from "@/lib/types/api/reserve";
import type { ErrorResponse } from "@/lib/types/api";
import type { CancelReservationResponse } from "@/lib/types/api/reserve";

/**
 * 予約パート変更エンドポイント。
 * バリデーションを行い、予約のパートを更新する。
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ reservationId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "認証が必要です" } satisfies ErrorResponse, { status: 401 });
  }

  const body = await request.json();
  const parsed = UpdateReservationPartSchema.safeParse(body);

  if (!parsed.success) {
    const errors = parsed.error.issues.map((e) => ({
      field: e.path.join("."),
      message: e.message,
    }));
    return NextResponse.json({ message: "入力内容に誤りがあります", errors } satisfies ErrorResponse, { status: 400 });
  }

  const { reservationId } = await params;
  const reservationRepo = new DrizzleReservationRepository();
  const result = await updateReservationPart(reservationRepo, {
    reservationId,
    userId: session.user.id,
    part: parsed.data.part,
  });

  if (result.status === "not-found") {
    return NextResponse.json({ message: "予約が見つかりません" } satisfies ErrorResponse, { status: 404 });
  }
  if (result.status === "forbidden") {
    return NextResponse.json({ message: "この操作は許可されていません" } satisfies ErrorResponse, { status: 403 });
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

  return NextResponse.json({ message: "予約を更新しました" } satisfies ErrorResponse);
}

/**
 * 予約キャンセルエンドポイント。
 * 予約レコードを削除する。
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ reservationId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "認証が必要です" } satisfies ErrorResponse, { status: 401 });
  }

  const { reservationId } = await params;
  const reservationRepo = new DrizzleReservationRepository();
  const result = await cancelReservation(reservationRepo, {
    reservationId,
    userId: session.user.id,
  });

  if (result.status === "not-found") {
    return NextResponse.json({ message: "予約が見つかりません" } satisfies ErrorResponse, { status: 404 });
  }
  if (result.status === "forbidden") {
    return NextResponse.json({ message: "この操作は許可されていません" } satisfies ErrorResponse, { status: 403 });
  }
  if (result.status === "closed") {
    return NextResponse.json({ message: "このイベントの受付は終了しています" } satisfies ErrorResponse, { status: 422 });
  }

  return NextResponse.json({ message: "予約をキャンセルしました" } satisfies CancelReservationResponse);
}
