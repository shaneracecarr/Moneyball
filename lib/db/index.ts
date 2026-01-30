import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn("DATABASE_URL is not set — database queries will fail at runtime.");
}

const client = postgres(connectionString || "postgres://localhost:5432/fallback", {
  prepare: false,
});

export const db = drizzle(client, { schema });
