import { sendVerificationEmail, sendPasswordResetEmail } from "@/server/services/auth/email";

beforeEach(() => {
  jest.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("sendVerificationEmail", () => {
  it("エラーなく実行できる", async () => {
    await expect(sendVerificationEmail("yamada@example.com", "483920")).resolves.not.toThrow();
  });
});

describe("sendPasswordResetEmail", () => {
  it("エラーなく実行できる", async () => {
    await expect(sendPasswordResetEmail("yamada@example.com", "847201")).resolves.not.toThrow();
  });
});
