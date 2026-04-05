import { pgTable, uuid, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";
import { events } from "./events";
import { songs } from "./songs";
import { partEnum } from "./enums";

export const reservations = pgTable("reservations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  eventId: uuid("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  songId: uuid("song_id")
    .notNull()
    .references(() => songs.id),
  parts: partEnum("parts").array().notNull(),
  snsConsent: boolean("sns_consent").notNull().default(false),
  comment: text("comment"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
