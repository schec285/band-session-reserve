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
  chorus: "コーラス",
  readGuitar: "リードギター",
  backingGuitar: "バッキングギター",
  bass: "ベース",
  drums: "ドラム",
  keyboard: "キーボード",
  other: "その他",
};

/**
 * パートの表示順。PART_LABELS の定義順を正とする。
 */
export const PART_ORDER: Part[] = Object.keys(PART_LABELS) as Part[];

/**
 * ボーカル系パート（エントリー数制限のカテゴリ判定に使用する）。
 */
export const VOCAL_PARTS: readonly Part[] = ["vocal", "chorus"];

/**
 * パートのエントリー数制限カテゴリを返す。
 * vocal / chorus は "vocal"、それ以外は "instrument" に分類する。
 */
export function getPartCategory(part: Part): "vocal" | "instrument" {
  return (VOCAL_PARTS as readonly string[]).includes(part) ? "vocal" : "instrument";
}

/**
 * 同一曲内で同時に選択できない禁止パートの組み合わせ。
 * 物理的に1人では演奏できない組み合わせを定義する。
 */
export const FORBIDDEN_SAME_SONG_PAIRS: [Part, Part][] = [
  ["vocal", "chorus"],
  ["readGuitar", "backingGuitar"],
  ["readGuitar", "bass"],
  ["readGuitar", "drums"],
  ["readGuitar", "keyboard"],
  ["backingGuitar", "bass"],
  ["backingGuitar", "keyboard"],
  ["backingGuitar", "drums"],
  ["bass", "drums"],
  ["bass", "keyboard"],
  ["drums", "keyboard"],
];
