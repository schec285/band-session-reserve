import { EventForm } from "@/features/admin/events/EventForm";
import { PageReady } from "@/components/layout/PageTransition";

/**
 * イベント新規作成ページ。
 */
export default function NewEventPage() {
  return (
    <div>
      <PageReady />
      <h1 className="text-2xl font-bold mb-6">イベント作成</h1>
      <EventForm />
    </div>
  );
}
