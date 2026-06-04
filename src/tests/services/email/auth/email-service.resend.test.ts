import type { Resend } from "resend";
import type { Mocked } from "vitest";
import { ResendEmailService } from "@/server/services/email/auth/email-service.resend";

const fromEmail = "test-from@example.com";

const mockResend = (): Mocked<Pick<Resend, "emails">> => ({
  emails: {
    send: vi.fn(),
  } as unknown as Mocked<Resend["emails"]>,
});

describe("ResendEmailService", () => {
  beforeEach(() => {
    process.env.RESEND_FROM_EMAIL = fromEmail;
  });

  describe("sendVerificationEmail", () => {
    describe("正常系", () => {
      it("認証コードを含むメールを送信して ok を返す", async () => {
        const resend = mockResend();
        (resend.emails.send as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { id: "msg_123" }, error: null });

        const service = new ResendEmailService(resend as unknown as Resend);
        const result = await service.sendVerificationEmail({
          to: "test@example.com",
          name: "テストユーザー",
          code: "123456",
        });

        expect(result.status).toBe("ok");
        expect(resend.emails.send).toHaveBeenCalledTimes(1);
        const callArg = (resend.emails.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(callArg.from).toBe(fromEmail);
        expect(callArg.to).toBe("test@example.com");
        expect(callArg.html).toContain("123456");
      });
    });

    describe("異常系", () => {
      it("Resend がエラーを返した場合 error を返す", async () => {
        const resend = mockResend();
        (resend.emails.send as ReturnType<typeof vi.fn>).mockResolvedValue({
          data: null,
          error: { name: "validation_error", message: "Invalid email" },
        });

        const service = new ResendEmailService(resend as unknown as Resend);
        const result = await service.sendVerificationEmail({
          to: "bad-email",
          name: "テストユーザー",
          code: "123456",
        });

        expect(result.status).toBe("error");
      });
    });
  });

  describe("sendWelcomeEmail", () => {
    describe("正常系", () => {
      it("登録完了メールを送信して ok を返す", async () => {
        const resend = mockResend();
        (resend.emails.send as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { id: "msg_123" }, error: null });

        const service = new ResendEmailService(resend as unknown as Resend);
        const result = await service.sendWelcomeEmail({
          to: "test@example.com",
          name: "テストユーザー",
        });

        expect(result.status).toBe("ok");
        expect(resend.emails.send).toHaveBeenCalledTimes(1);
        const callArg = (resend.emails.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(callArg.from).toBe(fromEmail);
        expect(callArg.to).toBe("test@example.com");
      });
    });

    describe("異常系", () => {
      it("Resend がエラーを返した場合 error を返す", async () => {
        const resend = mockResend();
        (resend.emails.send as ReturnType<typeof vi.fn>).mockResolvedValue({
          data: null,
          error: { name: "validation_error", message: "Invalid email" },
        });

        const service = new ResendEmailService(resend as unknown as Resend);
        const result = await service.sendWelcomeEmail({
          to: "bad-email",
          name: "テストユーザー",
        });

        expect(result.status).toBe("error");
      });
    });
  });
});
