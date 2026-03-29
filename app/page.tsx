import Link from "next/link";

export default function HomePage() {
  return (
    <div className="container">
      {/* ヒーローセクション */}
      <section className="hero">
        <div className="hero-badge">Band Session System</div>

        <h1 className="hero-title">
          みんなで演奏しよう。
          <br />
          <span>セッション予約</span>、簡単に。
        </h1>

        <p className="hero-description">
          弾きたい曲、担当パートを入力するだけ。
          バンドセッションへの参加予約がすぐに完了します。
        </p>

        <Link href="/reserve" className="btn-primary">
          <span>予約する</span>
          <span>→</span>
        </Link>

        {/* 特徴カード */}
        <div className="features">
          <div className="feature-card">
            <div className="feature-icon">🎵</div>
            <div className="feature-title">曲をリクエスト</div>
            <div className="feature-desc">弾きたい曲を自由に入力</div>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🎸</div>
            <div className="feature-title">パートを選択</div>
            <div className="feature-desc">ギター・ベース・ドラムなど</div>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📅</div>
            <div className="feature-title">日程を指定</div>
            <div className="feature-desc">参加したい日付を選ぶだけ</div>
          </div>
        </div>
      </section>
    </div>
  );
}
