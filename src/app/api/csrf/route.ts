import { NextResponse } from "next/server";
import { generateCsrfToken } from "@/server/services/csrf/csrf";

/**
 * CSRFトークン発行エンドポイント。
 * Double Submit Cookie パターン用に、トークンをJSONとSet-Cookieの両方で返す。
 */
export async function GET() {
  const csrfToken = generateCsrfToken();

  return NextResponse.json(
    { csrfToken },
    {
      headers: {
        "Set-Cookie": `csrf=${csrfToken}; SameSite=Strict; Path=/`,
      },
    }
  );
}
