#!/usr/bin/env node

/**
 * Database Fix Script
 *
 * This script fixes the database enum issues before running migrations.
 */

import { neon } from "@neondatabase/serverless";

async function fixDatabase() {
  console.log("🔧 Fixing database enum issues...");

  try {
    // Get database URL from environment
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      console.error("❌ DATABASE_URL environment variable is required");
      process.exit(1);
    }

    const sql = neon(databaseUrl);

    console.log("📝 Updating generation status enum values...");

    // Update any existing "pending" status to "pending_clarification"
    await sql`
      UPDATE generation 
      SET status = 'pending_clarification' 
      WHERE status = 'pending'
    `;

    // Update any existing "pending" status in generation_job table
    await sql`
      UPDATE generation_job 
      SET status = 'pending_clarification' 
      WHERE status = 'pending'
    `;

    console.log("✅ Database enum values updated successfully!");
    console.log("📋 You can now run: pnpm run db:migrate");
  } catch (error) {
    console.error("❌ Error fixing database:", error.message);
    process.exit(1);
  }
}

fixDatabase();
