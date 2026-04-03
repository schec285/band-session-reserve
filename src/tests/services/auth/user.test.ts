import { findUserByUsername, findUserByEmail, createUser, authenticateUser, activateUser, updatePassword } from "@/server/services/auth/user";
import type { IUserRepository } from "@/server/repositories/auth/user-repository";
import type { IVerificationRepository } from "@/server/repositories/auth/verification-repository";

jest.mock("bcryptjs", () => ({
  hash: jest.fn().mockResolvedValue("hashed-password"),
  compare: jest.fn(),
}));

import bcrypt from "bcryptjs";

const verifiedUser = {
  id: "user-id",
  username: "山田太郎",
  email: "yamada@example.com",
  passwordHash: "hashed-password",
  role: "member",
  emailVerifiedAt: new Date(),
};

let mockRepo: jest.Mocked<IUserRepository>;
let mockVerificationRepo: jest.Mocked<IVerificationRepository>;

beforeEach(() => {
  jest.clearAllMocks();
  mockRepo = {
    findByUsername: jest.fn(),
    findByEmail: jest.fn(),
    create: jest.fn(),
    activateUser: jest.fn(),
    updatePassword: jest.fn(),
  };
  mockVerificationRepo = {
    save: jest.fn(),
    findBySessionId: jest.fn(),
    deleteBySessionId: jest.fn(),
  };
});

describe("findUserByUsername", () => {
  it("ユーザーが存在する場合はユーザーを返す", async () => {
    mockRepo.findByUsername.mockResolvedValue(verifiedUser);
    const result = await findUserByUsername(mockRepo, "山田太郎");
    expect(result).toEqual(verifiedUser);
  });

  it("ユーザーが存在しない場合は null を返す", async () => {
    mockRepo.findByUsername.mockResolvedValue(null);
    const result = await findUserByUsername(mockRepo, "unknown");
    expect(result).toBeNull();
  });
});

describe("findUserByEmail", () => {
  it("ユーザーが存在する場合はユーザーを返す", async () => {
    mockRepo.findByEmail.mockResolvedValue(verifiedUser);
    const result = await findUserByEmail(mockRepo, "yamada@example.com");
    expect(result).toEqual(verifiedUser);
  });

  it("ユーザーが存在しない場合は null を返す", async () => {
    mockRepo.findByEmail.mockResolvedValue(null);
    const result = await findUserByEmail(mockRepo, "unknown@example.com");
    expect(result).toBeNull();
  });
});

describe("createUser", () => {
  it("パスワードをハッシュ化してユーザーを作成する", async () => {
    mockRepo.create.mockResolvedValue(undefined);
    await createUser(mockRepo, {
      username: "山田太郎",
      email: "yamada@example.com",
      password: "p@ssw0rd",
    });
    expect(mockRepo.create).toHaveBeenCalledWith({
      username: "山田太郎",
      email: "yamada@example.com",
      passwordHash: "hashed-password",
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
    });
  });
});

describe("authenticateUser", () => {
  it("ok: 認証成功", async () => {
    mockRepo.findByEmail.mockResolvedValue(verifiedUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const result = await authenticateUser(mockRepo, "yamada@example.com", "p@ssw0rd");
    expect(result).toEqual({ status: "ok", user: { id: "user-id", role: "member" } });
  });

  it("not-found: メールアドレスが存在しない", async () => {
    mockRepo.findByEmail.mockResolvedValue(null);

    const result = await authenticateUser(mockRepo, "unknown@example.com", "p@ssw0rd");
    expect(result).toEqual({ status: "not-found" });
  });

  it("wrong-password: パスワードが正しくない", async () => {
    mockRepo.findByEmail.mockResolvedValue(verifiedUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    const result = await authenticateUser(mockRepo, "yamada@example.com", "wrong");
    expect(result).toEqual({ status: "wrong-password" });
  });

  it("unverified: メールアドレス未認証", async () => {
    mockRepo.findByEmail.mockResolvedValue({ ...verifiedUser, emailVerifiedAt: null });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const result = await authenticateUser(mockRepo, "yamada@example.com", "p@ssw0rd");
    expect(result).toEqual({ status: "unverified" });
  });
});

describe("activateUser", () => {
  it("ユーザーのメールアドレスを有効化し、認証コードを削除する", async () => {
    mockVerificationRepo.findBySessionId.mockResolvedValue({
      userId: "user-id",
      code: "483920",
      expiresAt: new Date(Date.now() + 60000),
    });
    mockVerificationRepo.deleteBySessionId.mockResolvedValue(undefined);
    mockRepo.activateUser.mockResolvedValue(undefined);

    await activateUser(mockVerificationRepo, mockRepo, "session-id");

    expect(mockVerificationRepo.deleteBySessionId).toHaveBeenCalledWith("session-id");
    expect(mockRepo.activateUser).toHaveBeenCalledWith("user-id");
  });
});

describe("updatePassword", () => {
  it("パスワードをハッシュ化して更新し、認証コードを削除する", async () => {
    mockVerificationRepo.findBySessionId.mockResolvedValue({
      userId: "user-id",
      code: "483920",
      expiresAt: new Date(Date.now() + 60000),
    });
    mockVerificationRepo.deleteBySessionId.mockResolvedValue(undefined);
    mockRepo.updatePassword.mockResolvedValue(undefined);

    await updatePassword(mockVerificationRepo, mockRepo, "session-id", "newP@ssw0rd");

    expect(mockVerificationRepo.deleteBySessionId).toHaveBeenCalledWith("session-id");
    expect(mockRepo.updatePassword).toHaveBeenCalledWith("user-id", "hashed-password");
  });
});
