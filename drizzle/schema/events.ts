import { pgTable, uuid, varchar, text, timestamp, integer } from "drizzle-orm/pg-core";

export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  startAt: timestamp("start_at", { mode: "date", withTimezone: true }).notNull(),
  endAt: timestamp("end_at", { mode: "date", withTimezone: true }).notNull(),
  closedAt: timestamp("closed_at", { mode: "date", withTimezone: true }),
  venue: varchar("venue", { length: 255 }).notNull(),
  venueFee: integer("venue_fee").notNull().default(0),
  description: text("description").notNull().default(""),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
});
