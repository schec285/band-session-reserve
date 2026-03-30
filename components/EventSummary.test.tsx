import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EventSummary from "./EventSummary";
import type { Event } from "@/types/reservation";

const event: Event = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  title: "セッションナイト Vol.3",
  date: "2026-04-05",
  venue: "渋谷スタジオA",
  description: "詳細な説明文です。",
  isPast: false,
};

describe("EventSummary", () => {
  it("イベントのタイトル・日付・会場を表示する", () => {
    render(<EventSummary event={event} onDetailClick={() => {}} />);

    expect(screen.getByText("セッションナイト Vol.3")).toBeInTheDocument();
    expect(screen.getByText(/2026\/04\/05/)).toBeInTheDocument();
    expect(screen.getByText(/渋谷スタジオA/)).toBeInTheDocument();
  });

  it("「詳細を見る」ボタンを表示する", () => {
    render(<EventSummary event={event} onDetailClick={() => {}} />);
    expect(screen.getByRole("button", { name: /詳細を見る/ })).toBeInTheDocument();
  });

  it("「詳細を見る」クリックで onDetailClick が呼ばれる", async () => {
    const onDetailClick = jest.fn();
    render(<EventSummary event={event} onDetailClick={onDetailClick} />);

    await userEvent.click(screen.getByRole("button", { name: /詳細を見る/ }));

    expect(onDetailClick).toHaveBeenCalledWith(event);
  });
});
