import type { Part } from "@/types/common";

export const VALID_PARTS: Part[] = [
  "readGuitar",
  "backingGuitar",
  "bass",
  "drums",
  "keyboard",
  "vocal",
  "other",
];

export const PART_LABELS: Record<Part, string> = {
  readGuitar: "リードギター",
  backingGuitar: "バッキングギター",
  bass: "ベース",
  drums: "ドラム",
  keyboard: "キーボード",
  vocal: "ボーカル",
  other: "その他",
};
