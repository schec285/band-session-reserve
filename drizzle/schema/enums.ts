import { pgEnum } from "drizzle-orm/pg-core";

/**
 * バンドセッションで募集するパートの種類を定義する。
 * 曲に応じて使用するパートを選択し、対応しないパートは予約対象外とする。
 */
export const partEnum = pgEnum("part", [
  "readGuitar",
  "backingGuitar",
  "bass",
  "drums",
  "keyboard",
  "vocal",
  "other",
]);

export type Part = (typeof partEnum.enumValues)[number];
