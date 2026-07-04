import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  isPasswordPolicySatisfied,
  isPasswordSimilarToIdentity,
} from "@/lib/utils/password";

const VALID_PASSWORD = "Passw0rd!234";

describe("isPasswordPolicySatisfied", () => {
  describe("正常系", () => {
    it("大文字・小文字・数字・記号を含む十分な長さのパスワードは true を返す", () => {
      expect(isPasswordPolicySatisfied(VALID_PASSWORD)).toBe(true);
    });

    it(`${PASSWORD_MAX_LENGTH}文字ちょうどのパスワードは true を返す`, () => {
      const password = "Aa1!" + "a".repeat(PASSWORD_MAX_LENGTH - 4);
      expect(password.length).toBe(PASSWORD_MAX_LENGTH);
      expect(isPasswordPolicySatisfied(password)).toBe(true);
    });

    it(`${PASSWORD_MIN_LENGTH}文字ちょうどのパスワードは true を返す`, () => {
      const password = "Aa1!" + "a".repeat(PASSWORD_MIN_LENGTH - 4);
      expect(password.length).toBe(PASSWORD_MIN_LENGTH);
      expect(isPasswordPolicySatisfied(password)).toBe(true);
    });
  });

  describe("異常系", () => {
    it(`${PASSWORD_MIN_LENGTH}文字未満の場合 false を返す`, () => {
      expect(isPasswordPolicySatisfied("Aa1!aaa")).toBe(false);
    });

    it(`${PASSWORD_MAX_LENGTH}文字を超える場合 false を返す`, () => {
      const password = "Aa1!" + "a".repeat(PASSWORD_MAX_LENGTH - 3);
      expect(password.length).toBe(PASSWORD_MAX_LENGTH + 1);
      expect(isPasswordPolicySatisfied(password)).toBe(false);
    });

    it("小文字を含まない場合 false を返す", () => {
      expect(isPasswordPolicySatisfied("PASSW0RD!23")).toBe(false);
    });

    it("大文字を含まない場合 false を返す", () => {
      expect(isPasswordPolicySatisfied("passw0rd!23")).toBe(false);
    });

    it("数字を含まない場合 false を返す", () => {
      expect(isPasswordPolicySatisfied("Password!ab")).toBe(false);
    });

    it("記号を含まない場合 false を返す", () => {
      expect(isPasswordPolicySatisfied("Passw0rd123")).toBe(false);
    });

    it("先頭に空白を含む場合 false を返す", () => {
      expect(isPasswordPolicySatisfied(" Passw0rd!23")).toBe(false);
    });

    it("末尾に空白を含む場合 false を返す", () => {
      expect(isPasswordPolicySatisfied("Passw0rd!23 ")).toBe(false);
    });
  });
});

describe("isPasswordSimilarToIdentity", () => {
  describe("正常系", () => {
    it("メールアドレスのローカル部・名前のいずれも含まない場合 false を返す", () => {
      expect(
        isPasswordSimilarToIdentity(VALID_PASSWORD, { email: "test@example.com", name: "テスト太郎" })
      ).toBe(false);
    });

    it("3文字未満の短いローカル部は誤検知を避けるため対象外", () => {
      expect(isPasswordSimilarToIdentity("ab12Ab12!", { email: "ab@example.com", name: null })).toBe(false);
    });

    it("3文字未満の短い名前は誤検知を避けるため対象外", () => {
      expect(isPasswordSimilarToIdentity("abYZ1234!", { email: "test@example.com", name: "ab" })).toBe(false);
    });

    it("name が null の場合でもメールアドレス側の判定は行われる", () => {
      expect(isPasswordSimilarToIdentity("Passw0rd!23", { email: "test@example.com", name: null })).toBe(false);
    });
  });

  describe("異常系", () => {
    it("パスワードにメールアドレスのローカル部を含む場合 true を返す", () => {
      expect(
        isPasswordSimilarToIdentity("MyTest1234!", { email: "test@example.com", name: null })
      ).toBe(true);
    });

    it("大文字小文字を無視してメールアドレスのローカル部と一致する場合 true を返す", () => {
      expect(
        isPasswordSimilarToIdentity("MyTEST1234!", { email: "test@example.com", name: null })
      ).toBe(true);
    });

    it("パスワードに名前を含む場合 true を返す", () => {
      expect(
        isPasswordSimilarToIdentity("Yamada1234!", { email: "user@example.com", name: "Yamada" })
      ).toBe(true);
    });
  });
});
