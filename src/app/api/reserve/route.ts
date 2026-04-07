import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createReservation } from "@/server/services/reserve/reservation";
import { DrizzleReservationRepository } from "@/server/repositories/reserve/reservation-repository.drizzle";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * 予約作成エンドポイント。
 * 認証・バリデーションを行い、予約を受け付ける。
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "認証が必要です" }, { status: 401 });
  }

  const body = await request.json();
  const { eventSongId, part, snsConsent, comment } = body;

  if (!eventSongId || !UUID_REGEX.test(eventSongId)) {
    return NextResponse.json({ message: "イベント曲IDが不正です" }, { status: 400 });
  }

  const errors: { field: string; message: string }[] = [];
  if (part === undefined || part === null || part === "") {
    errors.push({ field: "part", message: "パートを選択してください" });
  }
  if (snsConsent === undefined || snsConsent === null) {
    errors.push({ field: "snsConsent", message: "選択してください" });
  }
  if (errors.length > 0) {
    return NextResponse.json({ message: "入力内容に誤りがあります", errors }, { status: 400 });
  }

  const reservationRepo = new DrizzleReservationRepository();
  const result = await createReservation(reservationRepo, {
    userId: session.user.id,
    eventSongId,
    part,
    snsConsent,
    comment,
  });

  if (result.status === "not-found") {
    return NextResponse.json({ message: "イベント曲が見つかりません" }, { status: 404 });
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

  return NextResponse.json({ message: "予約を受け付けました！セッションでお待ちしています 🎵" });
}
