import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PastEventsAccordion from "./PastEventsAccordion";
import type { Event } from "@/types/reservation";

const pastEvents: Event[] = [
  {
    id: "past-1",
    title: "セッションナイト Vol.2",
    date: "2026-03-15",
    venue: "渋谷スタジオA",
    description: "過去イベント1の説明",
    isPast: true,
  },
  {
    id: "past-2",
    title: "セッションナイト Vol.1",
    date: "2026-02-10",
    venue: "渋谷スタジオB",
    description: "過去イベント2の説明",
    isPast: true,
  },
];

describe("PastEventsAccordion", () => {
  describe("初期状態（折りたたみ）", () => {
    it("「過去のイベントを見る」ボタンを表示する", () => {
      render(
        <PastEventsAccordion events={pastEvents} onDetailClick={() => {}} />
      );
      expect(
        screen.getByRole("button", { name: /過去のイベントを見る/ })
      ).toBeInTheDocument();
    });

    it("初期状態でイベントカードは表示されない", () => {
      render(
        <PastEventsAccordion events={pastEvents} onDetailClick={() => {}} />
      );
      expect(screen.queryByText("セッションナイト Vol.2")).not.toBeInTheDocument();
    });
  });

  describe("展開", () => {
    it("ボタンクリックで過去イベントが表示される", async () => {
      render(
        <PastEventsAccordion events={pastEvents} onDetailClick={() => {}} />
      );

      await userEvent.click(
        screen.getByRole("button", { name: /過去のイベントを見る/ })
      );

      expect(screen.getByText("セッションナイト Vol.2")).toBeInTheDocument();
      expect(screen.getByText("セッションナイト Vol.1")).toBeInTheDocument();
    });

    it("展開後にボタンラベルが「閉じる」系に変わる", async () => {
      render(
        <PastEventsAccordion events={pastEvents} onDetailClick={() => {}} />
      );

      await userEvent.click(
        screen.getByRole("button", { name: /過去のイベントを見る/ })
      );

      expect(
        screen.getByRole("button", { name: /閉じる|非表示|▲/ })
      ).toBeInTheDocument();
    });

    it("展開後に再クリックで折りたたまれる", async () => {
      render(
        <PastEventsAccordion events={pastEvents} onDetailClick={() => {}} />
      );

      const button = screen.getByRole("button", { name: /過去のイベントを見る/ });
      await userEvent.click(button);
      await userEvent.click(screen.getByRole("button", { name: /閉じる|非表示|▲/ }));

      expect(screen.queryByText("セッションナイト Vol.2")).not.toBeInTheDocument();
    });

    it("詳細クリックで onDetailClick が呼ばれる", async () => {
      const onDetailClick = jest.fn();
      render(
        <PastEventsAccordion events={pastEvents} onDetailClick={onDetailClick} />
      );

      await userEvent.click(
        screen.getByRole("button", { name: /過去のイベントを見る/ })
      );
      const detailButtons = screen.getAllByRole("button", { name: /詳細を見る/ });
      await userEvent.click(detailButtons[0]);

      expect(onDetailClick).toHaveBeenCalledWith(pastEvents[0]);
    });
  });

  describe("イベント0件", () => {
    it("イベントがないとき「過去のイベントを見る」ボタンを表示しない", () => {
      render(<PastEventsAccordion events={[]} onDetailClick={() => {}} />);
      expect(
        screen.queryByRole("button", { name: /過去のイベントを見る/ })
      ).not.toBeInTheDocument();
    });
  });
});
