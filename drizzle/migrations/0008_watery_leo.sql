CREATE TABLE "event_song_parts" (
	"event_song_id" uuid NOT NULL,
	"part" "part" NOT NULL,
	CONSTRAINT "event_song_parts_event_song_id_part_pk" PRIMARY KEY("event_song_id","part")
);
--> statement-breakpoint
ALTER TABLE "event_song_parts" ADD CONSTRAINT "event_song_parts_event_song_id_event_songs_id_fk" FOREIGN KEY ("event_song_id") REFERENCES "public"."event_songs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
INSERT INTO "event_song_parts" ("event_song_id", "part") SELECT "id", unnest("parts") FROM "event_songs";--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_event_song_part_fk" FOREIGN KEY ("event_song_id","part") REFERENCES "public"."event_song_parts"("event_song_id","part") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_songs" DROP COLUMN "parts";