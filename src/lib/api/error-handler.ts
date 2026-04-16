import { NextResponse } from "next/server";
import type { ErrorResponse } from "@/lib/types/api";

/**
 * APIルートハンドラーを try-catch でラップし、予期せぬエラーを 500 レスポンスに変換するユーティリティ。
 * 呼び出し元のハンドラーがスローした場合、コンソールにエラーを出力したうえで統一フォーマットで返す。
 */
export async function withApiHandler<T>(
  fn: () => Promise<T>
): Promise<T | NextResponse<ErrorResponse>> {
  try {
    return await fn();
  } catch (error) {
    console.error("[API Error]", error);
    return NextResponse.json(
      { message: "サーバーエラーが発生しました" } satisfies ErrorResponse,
      { status: 500 }
    );
  }
}
