import { getEvents } from "@/server/services/events/events";
import { DrizzleEventRepository } from "@/server/repositories/events/event-repository.drizzle";
import { EventList } from "@/features/events/EventList";

/**
 * トップページ。イベント一覧を表示する。
 */
export default async function HomePage() {
  const repo = new DrizzleEventRepository();
  const events = await getEvents(repo);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">イベント一覧</h1>
      <EventList events={events} />
    </div>
  );
}
