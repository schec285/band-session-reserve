/**
 * 日付を「YYYY年M月D日」形式にフォーマットする。
 */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

/**
 * 時刻を「HH:mm」形式にフォーマットする。
 */
export function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/**
 * 日時を「YYYY年M月D日 HH:mm」形式にフォーマットする。
 */
export function formatDatetime(iso: string): string {
  return `${formatDate(iso)} ${formatTime(iso)}`;
}
