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
  const dateNow = new Date();

  const [, member1] = await db
    .insert(users)
    .values([
      {
        name: "管理者",
        email: "admin@example.com",
        passwordHash,
        emailVerified: dateNow,
        role: "admin",
      },
      {
        name: "テストユーザー",
        email: "test@example.com",
        passwordHash,
        emailVerified: dateNow,
        role: "member",
      },
    ])
    .returning({ id: users.id });

  console.log("✅ ユーザー作成完了");

  // 曲
  await db
    .insert(songs)
    .values([
      { title: "Don't Stop Me Now", artist: "Queen" },
      { title: "Bohemian Rhapsody", artist: "Queen" },
      { title: "Highway to Hell", artist: "AC/DC" },
    ])
    .returning({ id: songs.id });

  console.log("✅ 曲作成完了");
  console.log("🎸 シード完了！");
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => pool.end());
