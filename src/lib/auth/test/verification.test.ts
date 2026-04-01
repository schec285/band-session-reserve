import {
  validateVerificationCode,
  activateUser,
  validatePasswordResetCode,
  updatePassword,
} from "../verification";

jest.mock("@/lib/db", () => ({
  db: {
    select: jest.fn(),
    update: jest.fn(),
  },
}));

import { db } from "@/lib/db";

const validRecord = {
  userId: "user-id",
  code: "483920",
  usedAt: null,
  expiresAt: new Date(Date.now() + 60000),
};

beforeEach(() => {
  jest.clearAllMocks();
  (db.select as jest.Mock).mockReturnValue({
    from: jest.fn().mockReturnValue({
      where: jest.fn().mockResolvedValue([validRecord]),
    }),
  });
  (db.update as jest.Mock).mockReturnValue({
    set: jest.fn().mockReturnValue({
      where: jest.fn().mockResolvedValue(undefined),
    }),
  });
});

describe("validateVerificationCode", () => {
  it("正しいコードは valid を返す", async () => {
    const result = await validateVerificationCode("valid-challenge", "483920");
    expect(result).toBe("valid");
  });

  it("コードが一致しない場合は invalid を返す", async () => {
    const result = await validateVerificationCode("valid-challenge", "000000");
    expect(result).toBe("invalid");
  });

  it("有効期限切れは expired を返す", async () => {
    (db.select as jest.Mock).mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([
          { ...validRecord, expiresAt: new Date(Date.now() - 1000) },
        ]),
      }),
    });

    const result = await validateVerificationCode("expired-challenge", "483920");
    expect(result).toBe("expired");
  });

  it("使用済みコードは invalid を返す", async () => {
    (db.select as jest.Mock).mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([
          { ...validRecord, usedAt: new Date() },
        ]),
      }),
    });

    const result = await validateVerificationCode("used-challenge", "483920");
    expect(result).toBe("invalid");
  });
});

describe("activateUser", () => {
  it("ユーザーのメールアドレスを有効化する", async () => {
    await activateUser("valid-challenge");
    expect(db.update).toHaveBeenCalled();
  });
});

describe("validatePasswordResetCode", () => {
  it("正しいコードは valid を返す", async () => {
    const result = await validatePasswordResetCode("valid-challenge", "483920");
    expect(result).toBe("valid");
  });

  it("コードが一致しない場合は invalid を返す", async () => {
    const result = await validatePasswordResetCode("valid-challenge", "000000");
    expect(result).toBe("invalid");
  });

  it("有効期限切れは expired を返す", async () => {
    (db.select as jest.Mock).mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([
          { ...validRecord, expiresAt: new Date(Date.now() - 1000) },
        ]),
      }),
    });

    const result = await validatePasswordResetCode("expired-challenge", "483920");
    expect(result).toBe("expired");
  });
});

describe("updatePassword", () => {
  it("パスワードを更新する", async () => {
    await updatePassword("valid-challenge", "newP@ssw0rd");
    expect(db.update).toHaveBeenCalled();
  });
});
