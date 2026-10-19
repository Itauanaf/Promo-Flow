import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export * from "./schema";
export * from "./repositories";

export function createDatabase(url = process.env.DATABASE_URL) {
  if (!url) throw new Error("DATABASE_URL is required on the server");
  const client = postgres(url, { prepare: false, max: 5 });
  return drizzle(client, { schema });
}

export type Database = ReturnType<typeof createDatabase>;
