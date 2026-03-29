import Link from "next/link";
import ReserveForm from "@/components/ReserveForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "予約フォーム | バンドセッション予約",
  description: "バンドセッションへの参加予約フォーム",
};

export default function ReservePage() {
  return (
    <div className="container">
      <div className="page">
        {/* 戻るリンク */}
        <div className="back-link">
          <Link href="/" className="btn-secondary">
            ← トップへ戻る
          </Link>
        </div>

        <h1 className="page-title">セッション予約</h1>
        <p className="page-subtitle">
          必要事項を入力して、バンドセッションに参加しよう！
        </p>

        {/* 予約フォーム（Client Component） */}
        <ReserveForm />
      </div>
    </div>
  );
}
