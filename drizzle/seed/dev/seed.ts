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
 * 全テーブルをTRUNCATEするため、本番環境（APP_ENV=production）では実行を拒否する。
 */
async function seed() {
  if (process.env.APP_ENV === "production") {
    throw new Error(
      "本番環境(APP_ENV=production)ではdb:seed:devを実行できません。全テーブルがTRUNCATEされ、本番データが失われます。"
    );
  }

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
      { title: "We Will Rock You", artist: "Queen" },
      { title: "Back in Black", artist: "AC/DC" },
      { title: "Smoke on the Water", artist: "Deep Purple" },
      { title: "Sweet Child O' Mine", artist: "Guns N' Roses" },
      { title: "November Rain", artist: "Guns N' Roses" },
      { title: "Enter Sandman", artist: "Metallica" },
      { title: "Nothing Else Matters", artist: "Metallica" },
      { title: "Livin' on a Prayer", artist: "Bon Jovi" },
      { title: "It's My Life", artist: "Bon Jovi" },
      { title: "Eye of the Tiger", artist: "Survivor" },
      { title: "Don't Stop Believin'", artist: "Journey" },
      { title: "Any Way You Want It", artist: "Journey" },
      { title: "Jump", artist: "Van Halen" },
      { title: "Paranoid", artist: "Black Sabbath" },
      { title: "Iron Man", artist: "Black Sabbath" },
      { title: "Aqualung", artist: "Jethro Tull" },
      { title: "Stairway to Heaven", artist: "Led Zeppelin" },
      { title: "Whole Lotta Love", artist: "Led Zeppelin" },
      { title: "Come As You Are", artist: "Nirvana" },
      { title: "Smells Like Teen Spirit", artist: "Nirvana" },
      { title: "Basket Case", artist: "Green Day" },
      { title: "American Idiot", artist: "Green Day" },
      { title: "All the Small Things", artist: "blink-182" },
      { title: "The Middle", artist: "Jimmy Eat World" },
      { title: "Otherside", artist: "Red Hot Chili Peppers" },
      { title: "Californication", artist: "Red Hot Chili Peppers" },
      { title: "Can't Stop", artist: "Red Hot Chili Peppers" },
      { title: "Under the Bridge", artist: "Red Hot Chili Peppers" },
      { title: "Numb", artist: "Linkin Park" },
      { title: "In the End", artist: "Linkin Park" },
      { title: "Believer", artist: "Imagine Dragons" },
      { title: "Radioactive", artist: "Imagine Dragons" },
      { title: "Feel Good Inc.", artist: "Gorillaz" },
      { title: "Seven Nation Army", artist: "The White Stripes" },
      { title: "Mr. Brightside", artist: "The Killers" },
      { title: "Take Me Out", artist: "Franz Ferdinand" },
      { title: "Song 2", artist: "Blur" },
      { title: "Wonderwall", artist: "Oasis" },
      { title: "Don't Look Back in Anger", artist: "Oasis" },
      { title: "Yellow", artist: "Coldplay" },
      { title: "Viva la Vida", artist: "Coldplay" },
      { title: "Thunder", artist: "Imagine Dragons" },
      { title: "Uptown Funk", artist: "Mark Ronson feat. Bruno Mars" },
      { title: "Billie Jean", artist: "Michael Jackson" },
      { title: "Beat It", artist: "Michael Jackson" },
      { title: "Superstition", artist: "Stevie Wonder" },
      { title: "September", artist: "Earth, Wind & Fire" },
      { title: "Get Lucky", artist: "Daft Punk feat. Pharrell Williams" },
      { title: "Superstitious", artist: "Europe" },
      { title: "The Final Countdown", artist: "Europe" },
      { title: "Africa", artist: "TOTO" },
      { title: "Roseanna", artist: "TOTO" },
      { title: "Hotel California", artist: "Eagles" },
      { title: "Take It Easy", artist: "Eagles" },
      { title: "Imagine", artist: "John Lennon" },
      { title: "Let It Be", artist: "The Beatles" },
      { title: "Hey Jude", artist: "The Beatles" },
      { title: "Come Together", artist: "The Beatles" },
      { title: "I Want to Hold Your Hand", artist: "The Beatles" },
      { title: "Satisfaction", artist: "The Rolling Stones" },
      { title: "Paint It Black", artist: "The Rolling Stones" },
      { title: "Purple Rain", artist: "Prince" },
      { title: "Kiss", artist: "Prince" },
      { title: "Sweet Home Alabama", artist: "Lynyrd Skynyrd" },
      { title: "Free Bird", artist: "Lynyrd Skynyrd" },
      { title: "Born to Run", artist: "Bruce Springsteen" },
      { title: "Livin' la Vida Loca", artist: "Ricky Martin" },
      { title: "Zenzenzense", artist: "RADWIMPS" },
      { title: "前前前世", artist: "RADWIMPS" },
      { title: "スパークル", artist: "RADWIMPS" },
      { title: "打上花火", artist: "DAOKO×米津玄師" },
      { title: "Lemon", artist: "米津玄師" },
      { title: "パプリカ", artist: "Foorin" },
      { title: "馬と鹿", artist: "米津玄師" },
      { title: "紅蓮華", artist: "LiSA" },
      { title: "炎", artist: "LiSA" },
      { title: "睡眠時間", artist: "夜久一" },
      { title: "第ゼロ感", artist: "amazarashi" },
      { title: "怪獣の花唄", artist: "四星球" },
      { title: "群青", artist: "YOASOBI" },
      { title: "夜に駆ける", artist: "YOASOBI" },
      { title: "アイドル", artist: "YOASOBI" },
      { title: "マリーゴールド", artist: "あいみょん" },
      { title: "君はロックを聴かない", artist: "あいみょん" },
      { title: "ハルジオン", artist: "あいみょん" },
      { title: "Pretender", artist: "Official髭男dism" },
      { title: "I LOVE...", artist: "Official髭男dism" },
      { title: "Subtitle", artist: "Official髭男dism" },
      { title: "白日", artist: "King Gnu" },
      { title: "飛行艇", artist: "King Gnu" },
      { title: "小さな恋のうた", artist: "MONGOL800" },
      { title: "旅立ちの日に", artist: "ゆず" },
      { title: "夏色", artist: "ゆず" },
      { title: "again", artist: "YUI" },
      { title: "TOMORROW never knows", artist: "Mr.Children" },
      { title: "innocent world", artist: "Mr.Children" },
      { title: "HANABI", artist: "Mr.Children" },
      { title: "花束", artist: "back number" },
      { title: "高嶺の花子さん", artist: "back number" },
      { title: "香水", artist: "瑛人" },
      { title: "だから僕は音楽を辞めた", artist: "ヨルシカ" },
      { title: "楓", artist: "スピッツ" },
      { title: "チェリー", artist: "スピッツ" },
      { title: "ロビンソン", artist: "スピッツ" },
      { title: "アルクアラウンド", artist: "サカナクション" },
      { title: "新宝島", artist: "サカナクション" },
      { title: "ハイエナ", artist: "サカナクション" },
      { title: "changes", artist: "flumpool" },
      { title: "証", artist: "flumpool" },
      { title: "若者のすべて", artist: "フジファブリック" },
      { title: "銀河鉄道999", artist: "ゴダイゴ" },
      { title: "モンキー・マジック", artist: "ゴダイゴ" },
      { title: "M87", artist: "MAN WITH A MISSION" },
      { title: "Dead End in Tokyo", artist: "MAN WITH A MISSION" },
      { title: "青と夏", artist: "Mrs. GREEN APPLE" },
      { title: "ダンスホール", artist: "Mrs. GREEN APPLE" },
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
