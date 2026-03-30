import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ReserveForm from "./ReserveForm";
import type { Event } from "@/types/reservation";

const event: Event = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  title: "セッションナイト Vol.3",
  date: "2026-04-05",
  venue: "渋谷スタジオA",
  description: "詳細な説明文です。",
  isPast: false,
};

// fetch のモック
const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

describe("ReserveForm", () => {
  describe("初期表示", () => {
    it("フォームフィールドを表示する", () => {
      render(<ReserveForm event={event} />);

      expect(screen.getByLabelText(/曲名/)).toBeInTheDocument();
      expect(screen.getByLabelText(/パート/)).toBeInTheDocument();
      expect(screen.getByLabelText(/SNS/)).toBeInTheDocument();
      expect(screen.getByLabelText(/コメント/)).toBeInTheDocument();
    });

    it("日付フィールドはイベント日付で自動セットされ読み取り専用", () => {
      render(<ReserveForm event={event} />);

      const dateField = screen.getByDisplayValue("2026-04-05");
      expect(dateField).toBeInTheDocument();
      expect(dateField).toHaveAttribute("readonly");
    });

    it("送信ボタンを表示する", () => {
      render(<ReserveForm event={event} />);
      expect(
        screen.getByRole("button", { name: /予約を送信する/ })
      ).toBeInTheDocument();
    });
  });

  describe("バリデーション", () => {
    it("曲名が空のまま送信するとエラーを表示する", async () => {
      render(<ReserveForm event={event} />);

      await userEvent.click(
        screen.getByRole("button", { name: /予約を送信する/ })
      );

      expect(await screen.findByText(/曲名を入力してください/)).toBeInTheDocument();
    });

    it("入力するとそのフィールドのエラーが消える", async () => {
      render(<ReserveForm event={event} />);

      await userEvent.click(
        screen.getByRole("button", { name: /予約を送信する/ })
      );
      expect(await screen.findByText(/曲名を入力してください/)).toBeInTheDocument();

      await userEvent.type(screen.getByLabelText(/曲名/), "千本桜");

      expect(
        screen.queryByText(/曲名を入力してください/)
      ).not.toBeInTheDocument();
    });

    it("snsConsent 未選択のまま送信するとエラーを表示する", async () => {
      render(<ReserveForm event={event} />);

      await userEvent.type(screen.getByLabelText(/曲名/), "千本桜");
      await userEvent.click(
        screen.getByRole("button", { name: /予約を送信する/ })
      );

      expect(
        await screen.findByText(/SNS同意を選択してください/)
      ).toBeInTheDocument();
    });
  });

  describe("送信", () => {
    async function fillAndSubmit() {
      await userEvent.type(screen.getByLabelText(/曲名/), "千本桜");
      // パートはデフォルト（guitar）のままでOK
      // SNS同意を選択（「同意する」ラジオボタンまたはチェックボックス）
      await userEvent.click(screen.getByLabelText(/同意する/));
      await userEvent.click(
        screen.getByRole("button", { name: /予約を送信する/ })
      );
    }

    it("送信成功時に成功メッセージを表示する", async () => {
      mockFetch.mockResolvedValue({
        json: async () => ({
          success: true,
          message: "予約を受け付けました！セッションでお待ちしています 🎵",
        }),
      });

      render(<ReserveForm event={event} />);
      await fillAndSubmit();

      expect(
        await screen.findByText(/予約を受け付けました！/)
      ).toBeInTheDocument();
    });

    it("送信成功後にフォームをリセットする", async () => {
      mockFetch.mockResolvedValue({
        json: async () => ({ success: true, message: "予約を受け付けました！セッションでお待ちしています 🎵" }),
      });

      render(<ReserveForm event={event} />);
      await userEvent.type(screen.getByLabelText(/曲名/), "千本桜");
      await userEvent.click(screen.getByLabelText(/同意する/));
      await userEvent.click(
        screen.getByRole("button", { name: /予約を送信する/ })
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/曲名/)).toHaveValue("");
      });
    });

    it("送信中はボタンが disabled になり「送信中...」を表示する", async () => {
      let resolve: (v: unknown) => void;
      mockFetch.mockReturnValue(
        new Promise((r) => {
          resolve = r;
        })
      );

      render(<ReserveForm event={event} />);
      await userEvent.type(screen.getByLabelText(/曲名/), "千本桜");
      await userEvent.click(screen.getByLabelText(/同意する/));
      await userEvent.click(
        screen.getByRole("button", { name: /予約を送信する/ })
      );

      expect(
        screen.getByRole("button", { name: /送信中/ })
      ).toBeDisabled();

      // 後始末
      resolve!({ json: async () => ({ success: true, message: "" }) });
    });

    it("送信失敗時にエラーメッセージを表示する", async () => {
      mockFetch.mockResolvedValue({
        json: async () => ({
          success: false,
          message: "サーバーエラーが発生しました。しばらく後にお試しください。",
        }),
      });

      render(<ReserveForm event={event} />);
      await fillAndSubmit();

      expect(
        await screen.findByText(/サーバーエラーが発生しました/)
      ).toBeInTheDocument();
    });

    it("ネットワークエラー時に通信エラーメッセージを表示する", async () => {
      mockFetch.mockRejectedValue(new Error("Network Error"));

      render(<ReserveForm event={event} />);
      await fillAndSubmit();

      expect(
        await screen.findByText(/通信エラーが発生しました/)
      ).toBeInTheDocument();
    });

    it("fetch が /api/reserve に POST される", async () => {
      mockFetch.mockResolvedValue({
        json: async () => ({ success: true, message: "ok" }),
      });

      render(<ReserveForm event={event} />);
      await fillAndSubmit();

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/reserve",
          expect.objectContaining({ method: "POST" })
        );
      });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.eventId).toBe(event.id);
      expect(callBody.songTitle).toBe("千本桜");
      expect(callBody.snsConsent).toBe(true);
    });
  });
});
