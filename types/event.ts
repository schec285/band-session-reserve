import type { Part } from "./common";

export interface Event {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  closedAt: string | null;
  venue: string;
  description: string;
}

export interface SongReservation {
  part: Part;
  isFilled: boolean;
}

export interface Song {
  id: string;
  title: string;
  reservations: SongReservation[];
}
