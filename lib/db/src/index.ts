import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error(
    "\n[db] DATABASE_URL is not set.\n" +
    "  → On Replit: open the Database panel and provision a PostgreSQL instance,\n" +
    "    then run: pnpm --filter @workspace/db run push\n" +
    "  → Outside Replit: copy .env.example to .env and set DATABASE_URL,\n" +
    "    then run: pnpm --filter @workspace/db run push\n" +
    "  The server will start but all API calls will fail until this is configured.\n"
  );
}

const connectionString = process.env.DATABASE_URL ?? "postgresql://localhost/ski_service";

export const pool = new Pool({ connectionString });
export const db = drizzle(pool, { schema });

export * from "./schema";
