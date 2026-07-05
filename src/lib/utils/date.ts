const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const TZ = "Asia/Tokyo";

/**
 * UTC の Date オブジェクトを JST の ISO 8601 文字列（+09:00 付き）に変換する。
 * サービス層でのレスポンス生成に使用する。
 */
export function toJST(date: Date): string {
  const jst = new Date(date.getTime() + JST_OFFSET_MS);
  return jst.toISOString().slice(0, 19) + "+09:00";
}

/**
 * ISO 8601 文字列を datetime-local input 用の文字列（YYYY-MM-DDTHH:mm）に変換する。
 * UTC・+09:00 どちらの形式でも JST に変換してから切り出す。
 */
export function toDatetimeLocal(iso: string): string {
  const jst = new Date(new Date(iso).getTime() + JST_OFFSET_MS);
  return jst.toISOString().slice(0, 16);
}

/**
 * Date を JST の各パーツ（year, month, day, hour, minute）に分解する。
 */
function getJSTParts(date: Date): Record<string, string> {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return Object.fromEntries(formatter.formatToParts(date).map((p) => [p.type, p.value]));
}

/**
 * ISO 8601 文字列の JST 暦日の 0 時（UTC ミリ秒）を返す。
 */
function startOfJSTDay(iso: string): number {
  const p = getJSTParts(new Date(iso));
  return Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day));
}

/**
 * ISO 8601 文字列を JST で「YYYY年M月D日」形式にフォーマットする。
 */
export function formatDate(iso: string): string {
  const p = getJSTParts(new Date(iso));
  return `${p.year}年${p.month}月${p.day}日`;
}

/**
 * ISO 8601 文字列を JST で「HH:mm」形式にフォーマットする。
 */
export function formatTime(iso: string): string {
  const p = getJSTParts(new Date(iso));
  return `${p.hour}:${p.minute}`;
}

/**
 * ISO 8601 文字列を JST で「YYYY年M月D日 HH:mm」形式にフォーマットする。
 */
export function formatDatetime(iso: string): string {
  return `${formatDate(iso)} ${formatTime(iso)}`;
}

/**
 * 開始・終了日時を JST で範囲表示用にフォーマットする。
 * 同じ日付内: 「YYYY年M月D日 HH:mm 〜 HH:mm」
 * 日付をまたぐ場合: 「YYYY年M月D日 HH:mm 〜 YYYY年M月D日 HH:mm」
 */
export function formatDateRange(startAt: string, endAt: string): string {
  const startDate = formatDate(startAt);
  const endDate = formatDate(endAt);
  const startTime = formatTime(startAt);
  const endTime = formatTime(endAt);
  return startDate === endDate
    ? `${startDate} ${startTime} 〜 ${endTime}`
    : `${startDate} ${startTime} 〜 ${endDate} ${endTime}`;
}

/**
 * 締切日時までの残り日数を JST の暦日ベースで計算する。
 * 締切が今日より前の場合は null を返す。
 */
export function calcRemainingDays(closedAt: string, now: Date = new Date()): number | null {
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const diff = Math.round((startOfJSTDay(closedAt) - startOfJSTDay(now.toISOString())) / ONE_DAY_MS);
  return diff >= 0 ? diff : null;
}
