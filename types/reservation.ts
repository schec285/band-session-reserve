// パートの型
export type Part =
  | "readGuitar"
  | "backingGuitar"
  | "bass"
  | "drums"
  | "keyboard"
  | "vocal"
  | "other";

// イベントの型
export interface Event {
  id: string;
  title: string;
  startAt: string;         // ISO 8601 (例: "2026-04-20T10:00:00+09:00")
  endAt: string;           // ISO 8601 (例: "2026-04-20T18:00:00+09:00")
  closedAt: string | null; // 受付締め切り日時。null の場合は startAt で判断
  venue: string;
  description: string;
}

// 予約フォームの型（api-design.md に準拠）
export interface ReservationForm {
  eventId: string;
  songTitle: string;
  part: Part;
  snsConsent: boolean;
  comment?: string;
}

// バリデーションエラーの型
export interface FormErrors {
  eventId?: string;
  songTitle?: string;
  part?: string;
  snsConsent?: string;
}

// 予約レコードの型（DB保存時のデータ構造）
export interface Reservation {
  id: string;
  userId: string;
  songTitle: string;
  parts: Part[];
  snsConsent: boolean;
  comment?: string;
  createdAt: string;
}

// PATCH リクエストボディの型
export interface UpdateReservationBody {
  parts: Part[];
}

// APIレスポンスの型
export interface ApiResponse {
  success: boolean;
  message: string;
  token?: string; // ログイン時のみ
}

// パート選択肢のラベルマッピング
export const PART_LABELS: Record<Part, string> = {
  readGuitar: "リードギター",
  backingGuitar: "バッキングギター",
  bass: "ベース",
  drums: "ドラム",
  keyboard: "キーボード",
  vocal: "ボーカル",
  other: "その他",
};

// 許可するパートの値リスト
export const VALID_PARTS: Part[] = [
  "readGuitar",
  "backingGuitar",
  "bass",
  "drums",
  "keyboard",
  "vocal",
  "other",
];
