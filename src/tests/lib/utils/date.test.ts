import {
  toJST,
  toDatetimeLocal,
  formatDate,
  formatTime,
  formatDatetime,
  formatDateRange,
  calcRemainingDays,
  todayJSTDateString,
} from "@/lib/utils/date";

// UTC 2026-04-12T06:00:00Z = JST 2026-04-12T15:00:00+09:00
const UTC_6AM = new Date("2026-04-12T06:00:00.000Z");
const ISO_JST_15 = "2026-04-12T15:00:00+09:00";

// UTC 2026-04-12T15:30:00Z = JST 2026-04-13T00:30:00+09:00（日付をまたぐケース）
const UTC_15H30 = new Date("2026-04-12T15:30:00.000Z");
const ISO_JST_NEXT = "2026-04-13T00:30:00+09:00";

// UTC 2026-01-01T23:00:00Z = JST 2026-01-02T08:00:00+09:00（年またぎ隣接）
const UTC_JAN1 = new Date("2026-01-01T23:00:00.000Z");
const ISO_JST_JAN2 = "2026-01-02T08:00:00+09:00";

// ---------------------------------------------------------------------------
// toJST
// ---------------------------------------------------------------------------

describe("toJST", () => {
  it("UTC の Date を +09:00 オフセット付き ISO 8601 文字列に変換する", () => {
    expect(toJST(UTC_6AM)).toBe(ISO_JST_15);
  });

  it("日付をまたぐケース（UTC 15:30 → JST 翌日 00:30）", () => {
    expect(toJST(UTC_15H30)).toBe(ISO_JST_NEXT);
  });

  it("年をまたぐケース（UTC 1/1 23:00 → JST 1/2 08:00）", () => {
    expect(toJST(UTC_JAN1)).toBe(ISO_JST_JAN2);
  });

  it("秒は 00 で固定（ミリ秒は切り捨て）", () => {
    const d = new Date("2026-04-12T06:00:00.999Z");
    expect(toJST(d)).toBe("2026-04-12T15:00:00+09:00");
  });
});

// ---------------------------------------------------------------------------
// toDatetimeLocal
// ---------------------------------------------------------------------------

describe("toDatetimeLocal", () => {
  it("+09:00 付き ISO 文字列を datetime-local 形式（YYYY-MM-DDTHH:mm）に変換する", () => {
    expect(toDatetimeLocal(ISO_JST_15)).toBe("2026-04-12T15:00");
  });

  it("UTC の Z 付き ISO 文字列は JST に変換してから datetime-local 形式にする", () => {
    expect(toDatetimeLocal(UTC_6AM.toISOString())).toBe("2026-04-12T15:00");
  });

  it("日付をまたぐケース", () => {
    expect(toDatetimeLocal(ISO_JST_NEXT)).toBe("2026-04-13T00:30");
  });
});

// ---------------------------------------------------------------------------
// formatDate
// ---------------------------------------------------------------------------

describe("formatDate", () => {
  it("+09:00 付き ISO 文字列を JST で「YYYY年M月D日」形式にする", () => {
    expect(formatDate(ISO_JST_15)).toBe("2026年4月12日");
  });

  it("UTC Z 付き ISO 文字列（JST では翌日になるケース）を JST で正しく表示する", () => {
    // UTC 15:30 → JST 4/13 00:30
    expect(formatDate(UTC_15H30.toISOString())).toBe("2026年4月13日");
  });

  it("1 桁の月・日もゼロパディングしない", () => {
    // UTC 2026-01-01T00:00:00Z = JST 2026-01-01T09:00:00+09:00
    expect(formatDate("2026-01-01T09:00:00+09:00")).toBe("2026年1月1日");
  });
});

// ---------------------------------------------------------------------------
// formatTime
// ---------------------------------------------------------------------------

describe("formatTime", () => {
  it("+09:00 付き ISO 文字列を JST で「HH:mm」形式にする", () => {
    expect(formatTime(ISO_JST_15)).toBe("15:00");
  });

  it("UTC Z 付き ISO 文字列を JST で正しく表示する", () => {
    expect(formatTime(UTC_6AM.toISOString())).toBe("15:00");
  });

  it("分をゼロパディングする", () => {
    expect(formatTime("2026-04-12T09:05:00+09:00")).toBe("09:05");
  });
});

// ---------------------------------------------------------------------------
// formatDatetime
// ---------------------------------------------------------------------------

describe("formatDatetime", () => {
  it("「YYYY年M月D日 HH:mm」形式にする", () => {
    expect(formatDatetime(ISO_JST_15)).toBe("2026年4月12日 15:00");
  });

  it("UTC Z 付き ISO 文字列を JST で正しく表示する", () => {
    expect(formatDatetime(UTC_6AM.toISOString())).toBe("2026年4月12日 15:00");
  });
});

// ---------------------------------------------------------------------------
// formatDateRange
// ---------------------------------------------------------------------------

describe("formatDateRange", () => {
  it("同じ日付内の場合は「YYYY年M月D日 HH:mm 〜 HH:mm」形式にする", () => {
    expect(formatDateRange("2026-04-12T15:00:00+09:00", "2026-04-12T18:00:00+09:00")).toBe(
      "2026年4月12日 15:00 〜 18:00"
    );
  });

  it("日付が異なる場合は「YYYY年M月D日 HH:mm 〜 YYYY年M月D日 HH:mm」形式にする", () => {
    expect(formatDateRange("2026-04-12T23:00:00+09:00", "2026-04-13T01:00:00+09:00")).toBe(
      "2026年4月12日 23:00 〜 2026年4月13日 01:00"
    );
  });

  it("UTC の ISO 文字列でも JST に変換した上で日付をまたぐか判定する", () => {
    // startAt: UTC 2026-04-12T15:30:00Z = JST 2026-04-13T00:30:00
    // endAt:   UTC 2026-04-12T16:00:00Z = JST 2026-04-13T01:00:00（同じ JST 日付）
    expect(
      formatDateRange("2026-04-12T15:30:00.000Z", "2026-04-12T16:00:00.000Z")
    ).toBe("2026年4月13日 00:30 〜 01:00");
  });
});

// ---------------------------------------------------------------------------
// calcRemainingDays
// ---------------------------------------------------------------------------

describe("calcRemainingDays", () => {
  it("締切と現在時刻が同じ JST の日付の場合は 0 を返す", () => {
    const now = new Date("2026-04-12T01:00:00+09:00");
    expect(calcRemainingDays("2026-04-12T23:00:00+09:00", now)).toBe(0);
  });

  it("締切が JST で 3 日後の場合は 3 を返す（時刻は問わない）", () => {
    const now = new Date("2026-04-12T23:00:00+09:00");
    expect(calcRemainingDays("2026-04-15T00:00:00+09:00", now)).toBe(3);
  });

  it("締切が過去の場合は null を返す", () => {
    const now = new Date("2026-04-12T10:00:00+09:00");
    expect(calcRemainingDays("2026-04-10T23:00:00+09:00", now)).toBeNull();
  });

  it("UTC の ISO 文字列でも JST の暦日に変換してから計算する", () => {
    // now: UTC 2026-04-12T15:00:00Z = JST 2026-04-13T00:00:00
    // closedAt: UTC 2026-04-12T16:00:00Z = JST 2026-04-13T01:00:00（同じ JST 日付なので 0）
    const now = new Date("2026-04-12T15:00:00.000Z");
    expect(calcRemainingDays("2026-04-12T16:00:00.000Z", now)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// todayJSTDateString
// ---------------------------------------------------------------------------

describe("todayJSTDateString", () => {
  it("Date を JST の暦日で YYYY-MM-DD 形式にする", () => {
    expect(todayJSTDateString(UTC_6AM)).toBe("2026-04-12");
  });

  it("UTCでは同日でもJSTで日付が繰り上がる場合は繰り上がった日付を返す", () => {
    expect(todayJSTDateString(UTC_15H30)).toBe("2026-04-13");
  });

  it("月・日を2桁にゼロパディングする", () => {
    // UTC 2026-01-01T00:00:00Z = JST 2026-01-01T09:00:00+09:00
    expect(todayJSTDateString(new Date("2026-01-01T00:00:00.000Z"))).toBe("2026-01-01");
  });
});
