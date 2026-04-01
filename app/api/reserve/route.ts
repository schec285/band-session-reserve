import { NextRequest, NextResponse } from "next/server";
import type { ReservationForm } from "@/types/reserve";
import { VALID_PARTS } from "@/constants/parts";

// テスト用の既知イベントID（実装時はDBで検索する）
const KNOWN_EVENT_IDS = new Set(["550e8400-e29b-41d4-a716-446655440000"]);

function isAuthenticated(request: NextRequest): boolean {
  const session = request.cookies.get("session")?.value;
  const authorization = request.headers.get("authorization");
  return !!session && !!authorization?.startsWith("Bearer ");
}

export async function POST(request: NextRequest) {
  try {
    if (!isAuthenticated(request)) {
      return NextResponse.json(
        { success: false, message: "認証が必要です" },
        { status: 401 }
      );
    }

    const body: ReservationForm = await request.json();
    const { eventId, songTitle, part, snsConsent } = body;

    if (!eventId?.trim()) {
      return NextResponse.json(
        { success: false, message: "イベントIDが不正です" },
        { status: 400 }
      );
    }

    if (!KNOWN_EVENT_IDS.has(eventId)) {
      return NextResponse.json(
        { success: false, message: "指定されたイベントが見つかりません" },
        { status: 404 }
      );
    }

    if (!songTitle?.trim()) {
      return NextResponse.json(
        { success: false, message: "曲名は必須です" },
        { status: 400 }
      );
    }

    if (!part || !VALID_PARTS.includes(part)) {
      return NextResponse.json(
        { success: false, message: "パートが不正です" },
        { status: 400 }
      );
    }

    if (typeof snsConsent !== "boolean") {
      return NextResponse.json(
        { success: false, message: "SNS同意の値が不正です" },
        { status: 400 }
      );
    }

    console.log("=== 新規予約 ===");
    console.log({
      eventId,
      songTitle: songTitle.trim(),
      part,
      snsConsent,
      comment: body.comment?.trim() || "(なし)",
      receivedAt: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        success: true,
        message: "予約を受け付けました！セッションでお待ちしています 🎵",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("予約APIエラー:", error);
    return NextResponse.json(
      { success: false, message: "サーバーエラーが発生しました。しばらく後にお試しください。" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { success: false, message: "Method Not Allowed" },
    { status: 405 }
  );
}
