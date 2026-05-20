import { PostgresStore } from "@mastra/pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { mastraStorage } from "../mastra/storage.ts";
import * as schema from "./schema.ts";

export type Db = NodePgDatabase<typeof schema>;

let _db: Db | null = null;

export function getDb(): Db {
  if (_db) return _db;

  if (mastraStorage instanceof PostgresStore) {
    _db = drizzle(mastraStorage.pool, { schema });
    return _db;
  }

  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is required for the Drizzle repositories when Mastra storage is not Postgres",
    );
  }
  _db = drizzle(new Pool({ connectionString: process.env.DATABASE_URL }), { schema });
  return _db;
}
