import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../../../drizzle/schema";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/**
 * Drizzle ORM のDBクライアントインスタンス。
 * アプリ全体でシングルトンとして使用する。
 */
export const db = drizzle(pool, { schema });
