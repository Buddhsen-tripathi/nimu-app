#!/usr/bin/env node

/**
 * Run Specific Migration Script
 *
 * This script runs only the specific migration we need (column rename).
 */

import { neon } from "@neondatabase/serverless";

async function runSpecificMigration() {
  console.log(
    "🔧 Running specific migration: Rename bullmq_job_id to worker_job_id..."
  );

  try {
    // Get database URL from environment
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      console.error("❌ DATABASE_URL environment variable is required");
      process.exit(1);
    }

    const sql = neon(databaseUrl);

    console.log("📝 Checking if bullmq_job_id column exists...");

    // Check if the column exists
    const columnExists = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'generation' 
      AND column_name = 'bullmq_job_id'
    `;

    if (columnExists.length > 0) {
      console.log("📝 Renaming bullmq_job_id column to worker_job_id...");

      // Rename the column
      await sql`
        ALTER TABLE generation 
        RENAME COLUMN bullmq_job_id TO worker_job_id
      `;

      console.log("✅ Column renamed successfully!");
    } else {
      console.log(
        "ℹ️  Column bullmq_job_id does not exist, checking if worker_job_id exists..."
      );

      // Check if worker_job_id already exists
      const workerColumnExists = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'generation' 
        AND column_name = 'worker_job_id'
      `;

      if (workerColumnExists.length > 0) {
        console.log("✅ Column worker_job_id already exists!");
      } else {
        console.log("📝 Adding worker_job_id column...");

        // Add the column if it doesn't exist
        await sql`
          ALTER TABLE generation 
          ADD COLUMN worker_job_id text
        `;

        console.log("✅ Column worker_job_id added successfully!");
      }
    }

    console.log("🎉 Migration completed successfully!");
    console.log(
      "📋 Your database is now ready for the Cloudflare Worker integration."
    );
  } catch (error) {
    console.error("❌ Error running migration:", error.message);
    process.exit(1);
  }
}

runSpecificMigration();
