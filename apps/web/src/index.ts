import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./db/schema";

// Check if we're in build mode
const isBuildTime = process.env.NEXT_PHASE === "phase-production-build";

// Create a mock database connection for build time
const createDb = () => {
  if (isBuildTime) {
    // Return a mock db object during build
    return {
      query: {},
      select: () => ({}),
      insert: () => ({}),
      update: () => ({}),
      delete: () => ({}),
    } as any;
  }

  // Real database connection for runtime
  const sql = neon(process.env.DATABASE_URL!);
  return drizzle(sql, { schema });
};

export const db = createDb();
