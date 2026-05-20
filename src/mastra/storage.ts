import { PostgresStore } from "@mastra/pg";
import { LibSQLStore } from "@mastra/libsql";

export type MastraStorageDriver = "postgres" | "libsql";

function buildMastraStorage() {
  const driver = (process.env.MASTRA_STORAGE_DRIVER ?? "postgres") as MastraStorageDriver;

  if (driver === "postgres") {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is required when MASTRA_STORAGE_DRIVER=postgres");
    }
    return new PostgresStore({
      id: "pg-storage",
      connectionString: process.env.DATABASE_URL,
    });
  }

  if (driver === "libsql") {
    return new LibSQLStore({
      id: "libsql-storage",
      url: process.env.LIBSQL_URL ?? "file:./mastra.db",
    });
  }

  throw new Error(`Unknown MASTRA_STORAGE_DRIVER: ${driver}`);
}

// Single instance shared between Mastra's own storage wiring and the Drizzle
// client. Importing this singleton (instead of the `mastra` root) avoids a
// circular dependency between `src/mastra/index.ts` and `src/db/client.ts`.
export const mastraStorage = buildMastraStorage();
