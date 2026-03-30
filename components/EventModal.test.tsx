import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EventModal from "./EventModal";
import type { Event } from "@/types/reservation";

const upcomingEvent: Event = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  title: "セッションナイト Vol.3",
  date: "2026-04-05",
  venue: "渋谷スタジオA",
  description: "詳細な説明文です。初参加歓迎。",
  isPast: false,
};

const pastEvent: Event = {
  ...upcomingEvent,
  id: "550e8400-e29b-41d4-a716-446655440001",
  title: "セッションナイト Vol.2",
  date: "2026-03-15",
  isPast: true,
};

describe("EventModal", () => {
  describe("表示", () => {
    it("event が null のとき何も表示しない", () => {
      const { container } = render(
        <EventModal event={null} onClose={() => {}} />
      );
      expect(container).toBeEmptyDOMElement();
    });

    it("イベントのタイトル・日付・会場・説明を表示する", () => {
      render(<EventModal event={upcomingEvent} onClose={() => {}} />);

      expect(screen.getByText("セッションナイト Vol.3")).toBeInTheDocument();
      expect(screen.getByText(/2026\/04\/05/)).toBeInTheDocument();
      expect(screen.getByText(/渋谷スタジオA/)).toBeInTheDocument();
      expect(screen.getByText("詳細な説明文です。初参加歓迎。")).toBeInTheDocument();
    });

    it("開催予定イベントのとき「予約する」リンクを表示する", () => {
      render(<EventModal event={upcomingEvent} onClose={() => {}} />);

      const reserveLink = screen.getByRole("link", { name: /予約する/ });
      expect(reserveLink).toBeInTheDocument();
      expect(reserveLink).toHaveAttribute(
        "href",
        `/reserve?eventId=${upcomingEvent.id}`
      );
    });

    it("過去イベントのとき「予約する」リンクを表示しない", () => {
      render(<EventModal event={pastEvent} onClose={() => {}} />);
      expect(screen.queryByRole("link", { name: /予約する/ })).not.toBeInTheDocument();
    });
  });

  describe("閉じる操作", () => {
    it("✕ ボタンクリックで onClose が呼ばれる", async () => {
      const onClose = jest.fn();
      render(<EventModal event={upcomingEvent} onClose={onClose} />);

      await userEvent.click(screen.getByRole("button", { name: /閉じる|✕/ }));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("Esc キーで onClose が呼ばれる", async () => {
      const onClose = jest.fn();
      render(<EventModal event={upcomingEvent} onClose={onClose} />);

      await userEvent.keyboard("{Escape}");

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("モーダル外のオーバーレイクリックで onClose が呼ばれる", async () => {
      const onClose = jest.fn();
      render(<EventModal event={upcomingEvent} onClose={onClose} />);

      const overlay = screen.getByTestId("modal-overlay");
      await userEvent.click(overlay);

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
