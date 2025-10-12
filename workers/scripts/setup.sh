#!/bin/bash

# Nimu Workers Setup Script
# This script helps set up the Cloudflare Workers environment

set -e

echo "🚀 Setting up Nimu Generation Worker..."

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Installing..."
    npm install -g wrangler
fi

echo "✅ Wrangler CLI found"

# Check if user is logged in
if ! wrangler whoami &> /dev/null; then
    echo "🔐 Please login to Cloudflare..."
    wrangler login
fi

echo "✅ Cloudflare authentication verified"

# Get account ID
ACCOUNT_ID=$(wrangler whoami | grep "Account ID" | awk '{print $3}')
echo "📋 Account ID: $ACCOUNT_ID"

# Update wrangler.toml with account ID
if [ ! -z "$ACCOUNT_ID" ]; then
    echo "📝 Updating wrangler.toml with account ID..."
    # Note: You'll need to manually update wrangler.toml with the account ID
    echo "Please update wrangler.toml with your account ID: $ACCOUNT_ID"
fi

# Create R2 buckets
echo "🪣 Creating R2 buckets..."
wrangler r2 bucket create nimu-videos || echo "Bucket nimu-videos already exists"
wrangler r2 bucket create nimu-videos-dev || echo "Bucket nimu-videos-dev already exists"

echo "✅ R2 buckets created"

# Create R2 API token
echo "🔑 Creating R2 API token..."
echo "Please create an R2 API token manually:"
echo "1. Go to Cloudflare Dashboard > R2 Object Storage > Manage R2 API tokens"
echo "2. Create token with 'Object Read & Write' permissions"
echo "3. Add the Access Key ID and Secret Access Key to your .dev.vars file"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

echo "✅ Dependencies installed"

# Create .dev.vars if it doesn't exist
if [ ! -f .dev.vars ]; then
    echo "📝 Creating .dev.vars template..."
    cp .dev.vars.example .dev.vars 2>/dev/null || echo "Please create .dev.vars file manually"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update .dev.vars with your actual values"
echo "2. Create R2 API token and add credentials to .dev.vars"
echo "3. Get Veo3 API key and add to .dev.vars"
echo "4. Set up production secrets with: wrangler secret put <SECRET_NAME>"
echo "5. Run 'npm run dev' to start development"
echo ""
echo "For detailed instructions, see setup.md"
