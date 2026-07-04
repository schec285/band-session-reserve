import { z } from "zod";

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128; // 極端に長い入力によるハッシュ計算コスト増大＝乱用防止

export type PasswordRuleKey = "length" | "lowercase" | "uppercase" | "number" | "symbol" | "noEdgeSpace";

/**
 * パスワードポリシーのルール一覧。
 * Zodスキーマ・リアルタイムチェックリストUIの両方から参照する単一情報源。
 */
export const PASSWORD_RULES: { key: PasswordRuleKey; label: string; test: (password: string) => boolean }[] = [
  {
    key: "length",
    label: `${PASSWORD_MIN_LENGTH}文字以上${PASSWORD_MAX_LENGTH}文字以下`,
    test: (p) => p.length >= PASSWORD_MIN_LENGTH && p.length <= PASSWORD_MAX_LENGTH,
  },
  { key: "lowercase", label: "小文字（a〜z）を含む", test: (p) => /[a-z]/.test(p) },
  { key: "uppercase", label: "大文字（A〜Z）を含む", test: (p) => /[A-Z]/.test(p) },
  { key: "number", label: "数字（0〜9）を含む", test: (p) => /[0-9]/.test(p) },
  { key: "symbol", label: "記号を含む", test: (p) => /[^A-Za-z0-9]/.test(p) },
  { key: "noEdgeSpace", label: "先頭・末尾に空白を含まない", test: (p) => p === p.trim() && p.length > 0 },
];

/**
 * パスワードが全てのポリシールールを満たすかどうかを判定する。
 */
export function isPasswordPolicySatisfied(password: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(password));
}

/**
 * メールアドレスのローカル部またはユーザー名をパスワードが含む場合に true を返す。
 * 3文字未満の短いローカル部・名前は誤検知が多いため対象外とする。
 */
export function isPasswordSimilarToIdentity(
  password: string,
  identity: { email: string; name?: string | null }
): boolean {
  const lowerPassword = password.toLowerCase();

  const emailLocalPart = identity.email.split("@")[0]?.toLowerCase() ?? "";
  if (emailLocalPart.length >= 3 && lowerPassword.includes(emailLocalPart)) return true;

  const name = identity.name?.toLowerCase().trim() ?? "";
  if (name.length >= 3 && lowerPassword.includes(name)) return true;

  return false;
}

/**
 * パスワードポリシー（文字種の組み合わせ・上限文字数）を検証するZodスキーマを生成する。
 * 入力必須メッセージのみ呼び出し元でカスタマイズできる。
 */
export function passwordPolicySchema(requiredMessage: string) {
  return z
    .string({ error: (issue) => (issue.input === undefined ? requiredMessage : undefined) })
    .min(PASSWORD_MIN_LENGTH, `パスワードは${PASSWORD_MIN_LENGTH}文字以上で入力してください`)
    .max(PASSWORD_MAX_LENGTH, `パスワードは${PASSWORD_MAX_LENGTH}文字以下で入力してください`)
    .refine((p) => PASSWORD_RULES.find((r) => r.key === "lowercase")!.test(p), "小文字を含めてください")
    .refine((p) => PASSWORD_RULES.find((r) => r.key === "uppercase")!.test(p), "大文字を含めてください")
    .refine((p) => PASSWORD_RULES.find((r) => r.key === "number")!.test(p), "数字を含めてください")
    .refine((p) => PASSWORD_RULES.find((r) => r.key === "symbol")!.test(p), "記号を含めてください")
    .refine((p) => PASSWORD_RULES.find((r) => r.key === "noEdgeSpace")!.test(p), "先頭・末尾に空白を含めないでください");
}
