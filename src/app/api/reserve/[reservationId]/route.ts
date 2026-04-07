import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { updateReservationPart, cancelReservation } from "@/server/services/reserve/reservation";
import { DrizzleReservationRepository } from "@/server/repositories/reserve/reservation-repository.drizzle";

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
    return NextResponse.json({ message: "認証が必要です" }, { status: 401 });
  }

  const body = await request.json();
  const { part } = body;

  if (part === undefined || part === null || part === "") {
    return NextResponse.json(
      { message: "入力内容に誤りがあります", errors: [{ field: "part", message: "パートを選択してください" }] },
      { status: 400 }
    );
  }

  const { reservationId } = await params;
  const reservationRepo = new DrizzleReservationRepository();
  const result = await updateReservationPart(reservationRepo, {
    reservationId,
    userId: session.user.id,
    part,
  });

  if (result.status === "not-found") {
    return NextResponse.json({ message: "予約が見つかりません" }, { status: 404 });
  }
  if (result.status === "forbidden") {
    return NextResponse.json({ message: "この操作は許可されていません" }, { status: 403 });
  }
  if (result.status === "filled") {
    return NextResponse.json(
      { message: "このパートはすでに埋まっています", errors: [{ field: "part", message: "このパートはすでに埋まっています" }] },
      { status: 409 }
    );
  }
  if (result.status === "closed") {
    return NextResponse.json({ message: "このイベントの受付は終了しています" }, { status: 422 });
  }

  return NextResponse.json({ message: "予約を更新しました" });
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
    return NextResponse.json({ message: "認証が必要です" }, { status: 401 });
  }

  const { reservationId } = await params;
  const reservationRepo = new DrizzleReservationRepository();
  const result = await cancelReservation(reservationRepo, {
    reservationId,
    userId: session.user.id,
  });

  if (result.status === "not-found") {
    return NextResponse.json({ message: "予約が見つかりません" }, { status: 404 });
  }
  if (result.status === "forbidden") {
    return NextResponse.json({ message: "この操作は許可されていません" }, { status: 403 });
  }
  if (result.status === "closed") {
    return NextResponse.json({ message: "このイベントの受付は終了しています" }, { status: 422 });
  }

  return NextResponse.json({ message: "予約をキャンセルしました" });
}
