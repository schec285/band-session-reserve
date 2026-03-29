import { NextRequest, NextResponse } from "next/server";
import type { ReservationForm } from "@/types/reservation";

// 許可するパートの値
const VALID_PARTS = ["guitar", "bass", "drums", "keyboard", "vocal", "other"] as const;

export async function POST(request: NextRequest) {
  try {
    // JSONボディをパース
    const body: ReservationForm = await request.json();

    // ── サーバーサイドバリデーション ──────────────────────────
    const { name, date, songTitle, part } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, message: "名前は必須です" },
        { status: 400 }
      );
    }

    if (!date) {
      return NextResponse.json(
        { success: false, message: "日付は必須です" },
        { status: 400 }
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
    // ──────────────────────────────────────────────────────────

    // 現時点ではDBへの保存はせず、console.logで確認
    console.log("=== 新規予約 ===");
    console.log({
      name: name.trim(),
      date,
      songTitle: songTitle.trim(),
      part,
      comment: body.comment?.trim() || "(なし)",
      receivedAt: new Date().toISOString(),
    });

    // 成功レスポンス
    return NextResponse.json(
      {
        success: true,
        message: `予約を受け付けました！${name.trim()}さん、${date}のセッションでお待ちしています 🎵`,
      },
      { status: 200 }
    );
  } catch (error) {
    // JSONパースエラーや予期しないエラー
    console.error("予約APIエラー:", error);
    return NextResponse.json(
      { success: false, message: "サーバーエラーが発生しました。しばらく後にお試しください。" },
      { status: 500 }
    );
  }
}

// POST以外のメソッドは405を返す
export async function GET() {
  return NextResponse.json(
    { success: false, message: "Method Not Allowed" },
    { status: 405 }
  );
}
