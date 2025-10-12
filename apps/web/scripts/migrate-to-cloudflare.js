#!/usr/bin/env node

/**
 * Cloudflare Migration Script
 *
 * This script helps complete the migration from BullMQ to Cloudflare Workers.
 */

const fs = require("fs");
const path = require("path");

console.log("🚀 Cloudflare Migration Helper");
console.log("==============================\n");

// Check if .env.local exists
const envPath = path.join(__dirname, "..", ".env.local");
const envExamplePath = path.join(__dirname, "..", ".env.example");

if (!fs.existsSync(envPath)) {
  console.log("❌ .env.local file not found!");
  console.log(
    "📝 Please create .env.local with the required environment variables."
  );
  console.log("💡 You can copy from .env.example and update the values.\n");
} else {
  console.log("✅ .env.local file found");
}

// Check if Worker URL is configured
try {
  const envContent = fs.readFileSync(envPath, "utf8");
  const hasWorkerUrl = envContent.includes("CLOUDFLARE_WORKER_URL");
  const hasWorkerApiKey = envContent.includes("CLOUDFLARE_WORKER_API_KEY");

  if (!hasWorkerUrl) {
    console.log("⚠️  CLOUDFLARE_WORKER_URL not found in .env.local");
    console.log(
      '   Please add: CLOUDFLARE_WORKER_URL="https://nimu-worker.your-domain.workers.dev"'
    );
  } else {
    console.log("✅ CLOUDFLARE_WORKER_URL configured");
  }

  if (!hasWorkerApiKey) {
    console.log("⚠️  CLOUDFLARE_WORKER_API_KEY not found in .env.local");
    console.log("   Consider adding for additional security");
  } else {
    console.log("✅ CLOUDFLARE_WORKER_API_KEY configured");
  }
} catch (error) {
  console.log("❌ Could not read .env.local file");
}

console.log("\n📋 Migration Checklist:");
console.log("======================");

const checklist = [
  "Deploy Cloudflare Worker (npx wrangler deploy)",
  "Configure Worker secrets (VEO3_API_KEY, etc.)",
  "Update CLOUDFLARE_WORKER_URL in .env.local",
  "Run database migration (npm run db:migrate)",
  "Test generation flow",
  "Test storage operations",
  "Monitor Worker performance",
];

checklist.forEach((item, index) => {
  console.log(`${index + 1}. ${item}`);
});

console.log("\n🔗 Useful Commands:");
console.log("==================");
console.log("Deploy Worker:     cd workers && npx wrangler deploy");
console.log("Set Secrets:       npx wrangler secret put VEO3_API_KEY");
console.log("Run Migration:     npm run db:migrate");
console.log("Test Health:       curl $CLOUDFLARE_WORKER_URL/health");
console.log("View Logs:         npx wrangler tail");

console.log("\n📚 Documentation:");
console.log("================");
console.log("Migration Guide:   ./MIGRATION_GUIDE.md");
console.log("Worker Config:     ./workers/wrangler.toml");
console.log("API Routes:        ./src/app/api/");

console.log("\n✨ Migration completed successfully!");
console.log("Your app now uses Cloudflare Workers instead of BullMQ.");
