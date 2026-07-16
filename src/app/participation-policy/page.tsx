/**
 * 参加ポリシーページ。
 * イベント参加前に確認すべき参加費・キャンセル・SNS掲載等の注意事項を表示する。
 */
export default function ParticipationPolicyPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">参加ポリシー</h1>
      <p className="text-sm text-muted-foreground mb-8">
        本イベントへご参加いただく前に、以下の内容をご確認ください。
      </p>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">参加費について</h2>
        <p className="text-sm leading-relaxed">
          参加費はイベントごとに異なります。エントリー時に表示される金額をご確認のうえお申し込みください。
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">キャンセルについて</h2>
        <p className="text-sm leading-relaxed">
          エントリー締切（締切が設定されていない場合はイベント開始日時）以降は、システム上エントリー内容の変更・キャンセルができません。締切後にやむを得ずキャンセルが必要になった場合は、お手数ですが運営までご連絡ください。
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">その他</h2>
        <p className="text-sm leading-relaxed">
          セッションの様子（写真・動画等）をSNS等に掲載させていただく場合があります。掲載への同意可否はエントリー時に任意でお選びいただけます。
        </p>
      </section>
    </div>
  );
}
