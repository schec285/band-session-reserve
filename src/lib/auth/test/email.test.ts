import { sendVerificationEmail, sendPasswordResetEmail } from "../email";

jest.mock("nodemailer", () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue(undefined),
  }),
}));

import nodemailer from "nodemailer";

const mockSendMail = (nodemailer.createTransport as jest.Mock)().sendMail as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("sendVerificationEmail", () => {
  it("指定したメールアドレスに認証コードを送信する", async () => {
    await sendVerificationEmail("yamada@example.com", "483920");

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "yamada@example.com",
      })
    );
  });

  it("認証コードがメール本文に含まれる", async () => {
    await sendVerificationEmail("yamada@example.com", "483920");

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining("483920"),
      })
    );
  });
});

describe("sendPasswordResetEmail", () => {
  it("指定したメールアドレスにリセットコードを送信する", async () => {
    await sendPasswordResetEmail("yamada@example.com", "847201");

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "yamada@example.com",
      })
    );
  });

  it("リセットコードがメール本文に含まれる", async () => {
    await sendPasswordResetEmail("yamada@example.com", "847201");

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining("847201"),
      })
    );
  });
});
