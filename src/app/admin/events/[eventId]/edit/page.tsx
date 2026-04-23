import { notFound } from "next/navigation";
import { DrizzleAdminEventRepository } from "@/server/repositories/admin/event-repository.drizzle";
import { getEventForEdit } from "@/server/services/admin/events";
import { EventForm } from "@/features/admin/events/EventForm";
import { AdminEventSongManager } from "@/features/admin/songs/AdminEventSongManager";
import { DrizzleSongRepository } from "@/server/repositories/songs/song-repository.drizzle";
import { getAllSongs } from "@/server/services/admin/songs";

/**
 * イベント編集ページ。イベント情報の更新と曲の追加・削除を行う。
 */
export default async function EditEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const adminEventRepo = new DrizzleAdminEventRepository();
  const result = await getEventForEdit(adminEventRepo, eventId);

  if (result.status === "not-found") notFound();

  const { event, songs: eventSongs } = result;

  const songRepo = new DrizzleSongRepository();
  const allSongs = await getAllSongs(songRepo);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold mb-6">イベント編集</h1>
        <EventForm event={event} cancelPath={`/admin/events/${eventId}`} />
      </div>

      <div>
        <AdminEventSongManager
          eventId={eventId}
          eventSongs={eventSongs}
          allSongs={allSongs}
        />
      </div>
    </div>
  );
}
