# 🚀 **Quick Start Testing Guide**

## **Immediate Next Steps**

### 1. **Set Up Environment** (2 minutes)

```bash
# Create .env.local file
cd apps/web
echo 'CLOUDFLARE_WORKER_URL="https://nimu-generation-worker.amaanrizvi73.workers.dev"' > .env.local
echo 'CLOUDFLARE_WORKER_API_KEY="optional-api-key-for-worker-auth"' >> .env.local
```

### 2. **Start Your App** (1 minute)

```bash
# Start Next.js development server
pnpm dev
```

### 3. **Verify Worker is Working** (30 seconds)

```bash
# Test Worker health
curl https://nimu-generation-worker.amaanrizvi73.workers.dev/health
```

### 4. **Open Your App** (30 seconds)

- Go to: `http://localhost:3000`
- Sign up or log in
- You should see your dashboard

---

## **🎯 First Test: Create a Chat**

1. **Click "New Chat"** in your dashboard
2. **Type a message**: "Hello, I want to create a video"
3. **Send the message**
4. **Verify**: Message appears in chat

---

## **🎬 Second Test: Request Video Generation**

1. **Type**: "Create a 10-second video of a sunset"
2. **Send the request**
3. **Check**: Generation appears in your generations list
4. **Verify**: Status shows "pending_clarification" or similar

---

## **🔍 What to Look For**

### ✅ **Success Indicators:**

- Messages send without errors
- Generations appear in your list
- No console errors in browser
- Worker responds to health checks

### ❌ **Error Indicators:**

- "Failed to create generation" errors
- Messages not appearing
- Console errors about Worker communication
- Generation stuck in "pending" status

---

## **🚨 Quick Troubleshooting**

### If Worker is Down:

```bash
cd workers
npx wrangler deploy
```

### If Database Issues:

```bash
DATABASE_URL="your-db-url" pnpm run db:fix
```

### If App Won't Start:

```bash
pnpm install
pnpm dev
```

---

## **📋 Full Testing Plan**

For comprehensive testing, follow the complete guide: `TESTING_PLAN.md`

---

**Ready to start? Run these commands:**

```bash
# 1. Set up environment
cd apps/web
echo 'CLOUDFLARE_WORKER_URL="https://nimu-generation-worker.amaanrizvi73.workers.dev"' > .env.local

# 2. Start app
pnpm dev

# 3. Test Worker
curl https://nimu-generation-worker.amaanrizvi73.workers.dev/health

# 4. Open browser
# Go to: http://localhost:3000
```

**Then follow the testing steps above! 🚀**
