import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EventCard from "./EventCard";
import type { Event } from "@/types/reservation";

const upcomingEvent: Event = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  title: "セッションナイト Vol.3",
  date: "2026-04-05",
  venue: "渋谷スタジオA",
  description: "楽しいセッション。",
  isPast: false,
};

const pastEvent: Event = {
  ...upcomingEvent,
  id: "550e8400-e29b-41d4-a716-446655440001",
  title: "セッションナイト Vol.2",
  date: "2026-03-15",
  isPast: true,
};

describe("EventCard", () => {
  describe("開催予定イベント", () => {
    it("タイトル・日付・会場を表示する", () => {
      render(<EventCard event={upcomingEvent} onDetailClick={() => {}} />);

      expect(screen.getByText("セッションナイト Vol.3")).toBeInTheDocument();
      expect(screen.getByText(/2026\/04\/05/)).toBeInTheDocument();
      expect(screen.getByText(/渋谷スタジオA/)).toBeInTheDocument();
    });

    it("「詳細を見る」ボタンを表示する", () => {
      render(<EventCard event={upcomingEvent} onDetailClick={() => {}} />);
      expect(screen.getByRole("button", { name: /詳細を見る/ })).toBeInTheDocument();
    });

    it("「予約する」リンクを表示する", () => {
      render(<EventCard event={upcomingEvent} onDetailClick={() => {}} />);
      const reserveLink = screen.getByRole("link", { name: /予約する/ });
      expect(reserveLink).toBeInTheDocument();
      expect(reserveLink).toHaveAttribute(
        "href",
        `/reserve?eventId=${upcomingEvent.id}`
      );
    });

    it("「詳細を見る」クリックで onDetailClick が呼ばれる", async () => {
      const onDetailClick = jest.fn();
      render(<EventCard event={upcomingEvent} onDetailClick={onDetailClick} />);

      await userEvent.click(screen.getByRole("button", { name: /詳細を見る/ }));

      expect(onDetailClick).toHaveBeenCalledWith(upcomingEvent);
    });
  });

  describe("過去イベント", () => {
    it("タイトル・日付・会場を表示する", () => {
      render(<EventCard event={pastEvent} onDetailClick={() => {}} />);

      expect(screen.getByText("セッションナイト Vol.2")).toBeInTheDocument();
    });

    it("「詳細を見る」ボタンを表示する", () => {
      render(<EventCard event={pastEvent} onDetailClick={() => {}} />);
      expect(screen.getByRole("button", { name: /詳細を見る/ })).toBeInTheDocument();
    });

    it("「予約する」リンクを表示しない", () => {
      render(<EventCard event={pastEvent} onDetailClick={() => {}} />);
      expect(screen.queryByRole("link", { name: /予約する/ })).not.toBeInTheDocument();
    });
  });
});
