import type { Mocked } from "vitest";
import { signUp } from "@/server/services/auth/signup";
import { IUserRepository } from "@/server/repositories/auth/user-repository";

const mockUserRepo = (): Mocked<IUserRepository> => ({
  findByEmail: vi.fn(),
  create: vi.fn(),
});

describe("signUp", () => {
  describe("正常系", () => {
    it("新規ユーザーを作成して ok を返す", async () => {
      const repo = mockUserRepo();
      repo.findByEmail.mockResolvedValue(null);
      repo.create.mockResolvedValue();

      const result = await signUp(repo, {
        email: "test@example.com",
        password: "password123",
        name: "テストユーザー",
      });

      expect(result.status).toBe("ok");
      expect(repo.create).toHaveBeenCalledTimes(1);
      const callArg = repo.create.mock.calls[0][0];
      expect(callArg.email).toBe("test@example.com");
      expect(callArg.name).toBe("テストユーザー");
      expect(callArg.passwordHash).not.toBe("password123");
    });
  });

  describe("異常系", () => {
    it("メールアドレスが既に登録済みの場合 duplicate を返す", async () => {
      const repo = mockUserRepo();
      repo.findByEmail.mockResolvedValue({ id: "existing-user-id" });

      const result = await signUp(repo, {
        email: "test@example.com",
        password: "password123",
        name: "テストユーザー",
      });

      expect(result.status).toBe("duplicate");
      expect(repo.create).not.toHaveBeenCalled();
    });
  });
});
