import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { hash } from "bcryptjs";
import { sql } from "drizzle-orm";
import * as schema from "../../schema/index";

const { users, songs, events, eventSongs, reservations } = schema;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

/**
 * 開発環境用シードスクリプト。
 * admin ユーザー・メンバーユーザー・曲・イベント・予約のテストデータを投入する。
 */
async function seed() {
  console.log("🌱 シード開始...");

  // 既存データをクリア（FK 制約順に削除）
  await db.execute(sql`TRUNCATE TABLE reservations, event_songs, events, songs, users RESTART IDENTITY CASCADE`);
  console.log("🗑️ 既存データクリア完了");

  // ユーザー
  const passwordHash = await hash("Password1@", 10);

  const [, member1] = await db
    .insert(users)
    .values([
      {
        name: "管理者",
        email: "admin@example.com",
        passwordHash,
        role: "admin",
      },
      {
        name: "テストユーザー",
        email: "test@example.com",
        passwordHash,
        role: "member",
      },
    ])
    .returning({ id: users.id });

  console.log("✅ ユーザー作成完了");

  // 曲
  const [song1, song2, song3] = await db
    .insert(songs)
    .values([
      { title: "Don't Stop Me Now", artist: "Queen" },
      { title: "Bohemian Rhapsody", artist: "Queen" },
      { title: "Highway to Hell", artist: "AC/DC" },
    ])
    .returning({ id: songs.id });

  console.log("✅ 曲作成完了");

  // イベント（募集中）
  const openStart = new Date("2026-05-10T13:00:00+09:00");
  const openEnd = new Date("2026-05-10T18:00:00+09:00");
  const openClosed = new Date("2026-05-01T23:59:00+09:00");

  // イベント（締め切り済み）
  const closedStart = new Date("2026-03-15T13:00:00+09:00");
  const closedEnd = new Date("2026-03-15T18:00:00+09:00");
  const closedClosed = new Date("2026-03-08T23:59:00+09:00");

  const [openEvent, closedEvent] = await db
    .insert(events)
    .values([
      {
        title: "春のバンドセッション",
        startAt: openStart,
        endAt: openEnd,
        closedAt: openClosed,
        venue: "スタジオA",
        venueFee: 3000,
        description: "春のバンドセッションです。初心者歓迎！",
      },
      {
        title: "冬のバンドセッション",
        startAt: closedStart,
        endAt: closedEnd,
        closedAt: closedClosed,
        venue: "スタジオB",
        venueFee: 2500,
        description: "冬のバンドセッションです。",
      },
    ])
    .returning({ id: events.id });

  console.log("✅ イベント作成完了");

  // イベント曲
  const [, , es3] = await db
    .insert(eventSongs)
    .values([
      {
        eventId: openEvent.id,
        songId: song1.id,
        parts: ["vocal", "readGuitar", "backingGuitar", "bass", "drums"],
      },
      {
        eventId: openEvent.id,
        songId: song2.id,
        parts: ["vocal", "readGuitar", "bass", "keyboard"],
      },
      {
        eventId: closedEvent.id,
        songId: song3.id,
        parts: ["vocal", "readGuitar", "bass", "drums"],
      },
    ])
    .returning({ id: eventSongs.id });

  console.log("✅ イベント曲作成完了");

  // 予約（締め切り済みイベントのみ）
  await db.insert(reservations).values([
    {
      userId: member1.id,
      eventSongId: es3.id,
      part: "vocal",
      snsConsent: true,
      comment: "よろしくお願いします！",
    },
    {
      userId: member1.id,
      eventSongId: es3.id,
      part: "bass",
      snsConsent: false,
    },
  ]);

  console.log("✅ 予約作成完了");
  console.log("🎸 シード完了！");
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => pool.end());
