// 予約フォームの型定義
export type Part =
  | "guitar"
  | "bass"
  | "drums"
  | "keyboard"
  | "vocal"
  | "other";

export interface ReservationForm {
  name: string;
  date: string;
  songTitle: string;
  part: Part;
  comment?: string;
}

// バリデーションエラーの型
export interface FormErrors {
  name?: string;
  date?: string;
  songTitle?: string;
  part?: string;
}

// APIレスポンスの型
export interface ApiResponse {
  success: boolean;
  message: string;
}

// パート選択肢のラベルマッピング
export const PART_LABELS: Record<Part, string> = {
  guitar: "ギター",
  bass: "ベース",
  drums: "ドラム",
  keyboard: "キーボード",
  vocal: "ボーカル",
  other: "その他",
};
