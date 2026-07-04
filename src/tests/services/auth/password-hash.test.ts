import bcrypt from "bcryptjs";
import { hashPassword, verifyPassword } from "@/server/services/auth/password-hash";

const PASSWORD = "Passw0rd!23";

describe("hashPassword", () => {
  describe("正常系", () => {
    it("Argon2id形式（$argon2id$ プレフィックス）のハッシュを返す", async () => {
      const hash = await hashPassword(PASSWORD);
      expect(hash).toMatch(/^\$argon2id\$/);
    });

    it("生成したハッシュは平文パスワードと異なる", async () => {
      const hash = await hashPassword(PASSWORD);
      expect(hash).not.toBe(PASSWORD);
    });
  });
});

describe("verifyPassword", () => {
  describe("正常系", () => {
    it("Argon2idハッシュに対して正しいパスワードは valid: true, needsRehash: false を返す", async () => {
      const hash = await hashPassword(PASSWORD);
      const result = await verifyPassword(PASSWORD, hash);
      expect(result).toEqual({ valid: true, needsRehash: false });
    });

    it("bcryptハッシュ（移行期の既存ユーザー）に対して正しいパスワードは valid: true, needsRehash: true を返す", async () => {
      const bcryptHash = await bcrypt.hash(PASSWORD, 10);
      const result = await verifyPassword(PASSWORD, bcryptHash);
      expect(result).toEqual({ valid: true, needsRehash: true });
    });
  });

  describe("異常系", () => {
    it("Argon2idハッシュに対して誤ったパスワードは valid: false を返す", async () => {
      const hash = await hashPassword(PASSWORD);
      const result = await verifyPassword("wrongpassword", hash);
      expect(result).toEqual({ valid: false, needsRehash: false });
    });

    it("bcryptハッシュに対して誤ったパスワードは valid: false, needsRehash: false を返す", async () => {
      const bcryptHash = await bcrypt.hash(PASSWORD, 10);
      const result = await verifyPassword("wrongpassword", bcryptHash);
      expect(result).toEqual({ valid: false, needsRehash: false });
    });
  });
});
