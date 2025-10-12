#!/usr/bin/env node

const { execSync, spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("🚀 Setting up Nimu Generation Worker...");

// Check if wrangler is installed
function checkWrangler() {
  try {
    execSync("wrangler --version", { stdio: "pipe" });
    console.log("✅ Wrangler CLI found");
    return true;
  } catch (error) {
    console.log("❌ Wrangler CLI not found. Installing...");
    try {
      execSync("npm install -g wrangler", { stdio: "inherit" });
      console.log("✅ Wrangler CLI installed");
      return true;
    } catch (installError) {
      console.error("❌ Failed to install Wrangler CLI");
      return false;
    }
  }
}

// Check authentication
function checkAuth() {
  try {
    execSync("wrangler whoami", { stdio: "pipe" });
    console.log("✅ Cloudflare authentication verified");
    return true;
  } catch (error) {
    console.log("🔐 Please login to Cloudflare...");
    try {
      spawn("wrangler", ["login"], { stdio: "inherit" });
      return true;
    } catch (authError) {
      console.error("❌ Authentication failed");
      return false;
    }
  }
}

// Get account ID
function getAccountId() {
  try {
    const output = execSync("wrangler whoami", { encoding: "utf8" });
    const match = output.match(/Account ID: (\w+)/);
    if (match) {
      const accountId = match[1];
      console.log(`📋 Account ID: ${accountId}`);
      console.log(
        `Please update wrangler.toml with your account ID: ${accountId}`
      );
      return accountId;
    }
  } catch (error) {
    console.error("❌ Could not get account ID");
  }
  return null;
}

// Create R2 buckets
function createR2Buckets() {
  console.log("🪣 Creating R2 buckets...");

  const buckets = ["nimu-videos", "nimu-videos-dev"];

  buckets.forEach((bucket) => {
    try {
      execSync(`wrangler r2 bucket create ${bucket}`, { stdio: "pipe" });
      console.log(`✅ Created bucket: ${bucket}`);
    } catch (error) {
      console.log(`ℹ️  Bucket ${bucket} already exists`);
    }
  });
}

// Install dependencies
function installDependencies() {
  console.log("📦 Installing dependencies...");
  try {
    execSync("npm install", { stdio: "inherit" });
    console.log("✅ Dependencies installed");
  } catch (error) {
    console.error("❌ Failed to install dependencies");
  }
}

// Create .dev.vars if it doesn't exist
function createDevVars() {
  const devVarsPath = path.join(process.cwd(), ".dev.vars");
  const examplePath = path.join(process.cwd(), ".dev.vars.example");

  if (!fs.existsSync(devVarsPath)) {
    console.log("📝 Creating .dev.vars template...");
    if (fs.existsSync(examplePath)) {
      fs.copyFileSync(examplePath, devVarsPath);
      console.log("✅ .dev.vars created from template");
    } else {
      console.log("Please create .dev.vars file manually");
    }
  }
}

// Main setup function
async function setup() {
  try {
    // Check prerequisites
    if (!checkWrangler()) return;
    if (!checkAuth()) return;

    // Get account information
    getAccountId();

    // Create R2 buckets
    createR2Buckets();

    // Install dependencies
    installDependencies();

    // Create configuration files
    createDevVars();

    console.log("");
    console.log("🎉 Setup complete!");
    console.log("");
    console.log("Next steps:");
    console.log("1. Update .dev.vars with your actual values");
    console.log("2. Create R2 API token and add credentials to .dev.vars");
    console.log("3. Get Veo3 API key and add to .dev.vars");
    console.log(
      "4. Set up production secrets with: wrangler secret put <SECRET_NAME>"
    );
    console.log('5. Run "npm run dev" to start development');
    console.log("");
    console.log("For detailed instructions, see setup.md");
  } catch (error) {
    console.error("❌ Setup failed:", error.message);
    process.exit(1);
  }
}

// Run setup
setup();
