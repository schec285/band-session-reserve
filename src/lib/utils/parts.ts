import { z } from "zod";
import { partEnum } from "@drizzle/schema";
import type { Part } from "@drizzle/schema";

/**
 * パートのZodスキーマ。DBのenum値を正として使用する。
 */
export const PartSchema = z.enum(partEnum.enumValues);

/**
 * パートの日本語ラベル定義。
 */
export const PART_LABELS: Record<Part, string> = {
  vocal: "ボーカル",
  readGuitar: "リードギター",
  backingGuitar: "バッキングギター",
  bass: "ベース",
  drums: "ドラム",
  keyboard: "キーボード",
  other: "その他",
};

/**
 * 同一曲内で同時に選択できない禁止パートの組み合わせ。
 * 物理的に1人では演奏できない組み合わせを定義する。
 */
export const FORBIDDEN_SAME_SONG_PAIRS: [Part, Part][] = [
  ["readGuitar", "backingGuitar"],
  ["drums", "bass"],
  ["drums", "readGuitar"],
  ["drums", "backingGuitar"],
  ["drums", "keyboard"],
  ["bass", "readGuitar"],
  ["bass", "backingGuitar"],
];
