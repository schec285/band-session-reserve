import { notFound } from "next/navigation";
import { DrizzleEventRepository } from "@/server/repositories/events/event-repository.drizzle";
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
  const eventRepo = new DrizzleEventRepository();
  const record = await eventRepo.findEventById(eventId);

  if (!record) notFound();

  const event = {
    id: record.id,
    title: record.title,
    startAt: record.startAt.toISOString(),
    endAt: record.endAt.toISOString(),
    closedAt: record.closedAt ? record.closedAt.toISOString() : null,
    venue: record.venue,
    venueFee: record.venueFee,
    description: record.description,
  };

  const songRepo = new DrizzleSongRepository();
  const allSongs = await getAllSongs(songRepo);

  const eventSongsRaw = await eventRepo.findEventSongsWithReservations(eventId);
  const eventSongs = (eventSongsRaw ?? []).map((s) => ({
    eventSongId: s.eventSongId,
    songId: s.id,
    title: s.title,
    artist: s.artist,
    parts: s.reservations.map((r) => r.part),
  }));

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold mb-6">イベント編集</h1>
        <EventForm event={event} />
      </div>

      <div>
        <h2 className="text-xl font-bold mb-4">曲管理</h2>
        <AdminEventSongManager
          eventId={eventId}
          eventSongs={eventSongs}
          allSongs={allSongs}
        />
      </div>
    </div>
  );
}
