import type { Part } from "./common";

export interface ReservationForm {
  eventId: string;
  songTitle: string;
  part: Part;
  snsConsent: boolean;
  comment?: string;
}

export interface UpdateReservationBody {
  parts: Part[];
}

export interface Reservation {
  id: string;
  userId: string;
  songTitle: string;
  parts: Part[];
  snsConsent: boolean;
  comment?: string;
  createdAt: string;
}
