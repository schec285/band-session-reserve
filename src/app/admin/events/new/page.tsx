import { EventForm } from "@/features/admin/events/EventForm";

/**
 * イベント新規作成ページ。
 */
export default function NewEventPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">イベント作成</h1>
      <EventForm />
    </div>
  );
}
