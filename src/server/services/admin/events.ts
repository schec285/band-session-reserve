import type { IEventRepository } from "@/server/repositories/events/event-repository";
import type { AdminEventResponse, CreateEventInput, UpdateEventInput } from "@/lib/types/api/admin/events";

type CreateEventResult = { status: "ok"; event: AdminEventResponse };

type UpdateEventResult =
  | { status: "ok"; event: AdminEventResponse }
  | { status: "not-found" };

type DeleteEventResult =
  | { status: "ok" }
  | { status: "not-found" };

/**
 * IEventRecord を AdminEventResponse（ISO 8601 文字列）に変換する。
 */
function toResponse(record: {
  id: string;
  title: string;
  startAt: Date;
  endAt: Date;
  closedAt: Date | null;
  venue: string;
  description: string;
}): AdminEventResponse {
  return {
    id: record.id,
    title: record.title,
    startAt: record.startAt.toISOString(),
    endAt: record.endAt.toISOString(),
    closedAt: record.closedAt ? record.closedAt.toISOString() : null,
    venue: record.venue,
    description: record.description,
  };
}

/**
 * イベントを作成する。
 */
export async function createEvent(
  repo: IEventRepository,
  input: CreateEventInput
): Promise<CreateEventResult> {
  const record = await repo.createEvent({
    title: input.title,
    startAt: new Date(input.startAt),
    endAt: new Date(input.endAt),
    closedAt: input.closedAt ? new Date(input.closedAt) : null,
    venue: input.venue,
    description: input.description,
  });

  return { status: "ok", event: toResponse(record) };
}

/**
 * イベントを更新する。存在しない場合は status: "not-found" を返す。
 */
export async function updateEvent(
  repo: IEventRepository,
  eventId: string,
  input: UpdateEventInput
): Promise<UpdateEventResult> {
  const record = await repo.updateEvent(eventId, {
    title: input.title,
    startAt: new Date(input.startAt),
    endAt: new Date(input.endAt),
    closedAt: input.closedAt ? new Date(input.closedAt) : null,
    venue: input.venue,
    description: input.description,
  });

  if (!record) return { status: "not-found" };
  return { status: "ok", event: toResponse(record) };
}

/**
 * イベントを削除する。存在しない場合は status: "not-found" を返す。
 */
export async function deleteEvent(
  repo: IEventRepository,
  eventId: string
): Promise<DeleteEventResult> {
  const deleted = await repo.deleteEvent(eventId);
  if (!deleted) return { status: "not-found" };
  return { status: "ok" };
}
