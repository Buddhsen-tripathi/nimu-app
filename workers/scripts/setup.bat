@echo off
REM Nimu Workers Setup Script for Windows
REM This script helps set up the Cloudflare Workers environment

echo 🚀 Setting up Nimu Generation Worker...

REM Check if wrangler is installed
where wrangler >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Wrangler CLI not found. Installing...
    npm install -g wrangler
)

echo ✅ Wrangler CLI found

REM Check if user is logged in
wrangler whoami >nul 2>nul
if %errorlevel% neq 0 (
    echo 🔐 Please login to Cloudflare...
    wrangler login
)

echo ✅ Cloudflare authentication verified

REM Get account ID
echo 📋 Getting Account ID...
for /f "tokens=3" %%i in ('wrangler whoami ^| findstr "Account ID"') do set ACCOUNT_ID=%%i
echo Account ID: %ACCOUNT_ID%

REM Create R2 buckets
echo 🪣 Creating R2 buckets...
wrangler r2 bucket create nimu-videos 2>nul || echo Bucket nimu-videos already exists
wrangler r2 bucket create nimu-videos-dev 2>nul || echo Bucket nimu-videos-dev already exists

echo ✅ R2 buckets created

REM Create R2 API token instructions
echo 🔑 Creating R2 API token...
echo Please create an R2 API token manually:
echo 1. Go to Cloudflare Dashboard ^> R2 Object Storage ^> Manage R2 API tokens
echo 2. Create token with 'Object Read ^& Write' permissions
echo 3. Add the Access Key ID and Secret Access Key to your .dev.vars file

REM Install dependencies
echo 📦 Installing dependencies...
npm install

echo ✅ Dependencies installed

REM Create .dev.vars if it doesn't exist
if not exist .dev.vars (
    echo 📝 Creating .dev.vars template...
    if exist .dev.vars.example (
        copy .dev.vars.example .dev.vars
    ) else (
        echo Please create .dev.vars file manually
    )
)

echo.
echo 🎉 Setup complete!
echo.
echo Next steps:
echo 1. Update .dev.vars with your actual values
echo 2. Create R2 API token and add credentials to .dev.vars
echo 3. Get Veo3 API key and add to .dev.vars
echo 4. Set up production secrets with: wrangler secret put ^<SECRET_NAME^>
echo 5. Run 'npm run dev' to start development
echo.
echo For detailed instructions, see setup.md

pause
