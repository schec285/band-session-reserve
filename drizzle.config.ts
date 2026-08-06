import fs from "fs";
import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL && fs.existsSync(".env.local")) {
  dotenv.config({ path: ".env.local" });
}

export default defineConfig({
  schema: "./drizzle/schema",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
