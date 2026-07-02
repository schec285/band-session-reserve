import { extractGoogleMapsEmbedUrl } from "@/lib/utils/googleMapsEmbed";

interface Props {
  mapEmbedUrl: string | null;
}

/**
 * イベントの会場地図を表示する。
 * mapEmbedUrl を描画直前に再検証し、有効な Google マップ埋め込みURLでない場合は何も表示しない。
 * 属性はすべて固定値で、admin 入力由来の値は src 以外に一切使用しない。
 */
export function MapEmbed({ mapEmbedUrl }: Props) {
  const url = mapEmbedUrl ? extractGoogleMapsEmbedUrl(mapEmbedUrl) : null;
  if (!url) return null;

  return (
    <div className="mx-7 rounded-md border border-border overflow-hidden">
      <iframe
        src={url}
        width="100%"
        height="300"
        style={{ border: 0, display: "block" }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title="会場の地図"
      />
    </div>
  );
}
