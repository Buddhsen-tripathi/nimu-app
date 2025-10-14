# How to View Logs During Testing 📋

## 🚀 Quick Start

### 1. Start Development Servers

**Terminal 1 - Next.js App:**

```bash
cd apps/web
pnpm dev
```

**Terminal 2 - Cloudflare Worker:**

```bash
cd workers
npm run dev
```

**Terminal 3 - Worker Logs (Real-time):**

```bash
cd workers
wrangler tail --local
```

---

## 📊 Log Viewing Methods

### Method 1: Wrangler Tail (Recommended)

```bash
# For local development
wrangler tail --local

# For production (after deployment)
wrangler tail
```

### Method 2: Browser Console

- Open browser DevTools (F12)
- Go to Console tab
- Logs from Next.js will appear here

### Method 3: Terminal Output

- Next.js logs appear in Terminal 1
- Worker logs appear in Terminal 2 AND Terminal 3

---

## 🔍 What Logs to Look For

### When Testing Video Generation

**1. Next.js Logs (Terminal 1):**

```
[GENERATION_CREATE] Request received
[GENERATION_CREATE] Generation created in DB
[GENERATION_CREATE] Calling worker
[GENERATION_CREATE] Worker response
```

**2. Worker Logs (Terminal 2 & 3):**

```
[BACKGROUND_PROCESSING] Starting generation
[GENERATION_WORKFLOW] Starting generation
[GENERATION_WORKFLOW] Validating prompt
[GENERATION_WORKFLOW] Creating job
[VEO3_SERVICE] Starting video generation
[VEO3_SERVICE] Calling Veo3 API
[VEO3_SERVICE] Video generation started
[WEBHOOK] Sending webhook
[WEBHOOK] Webhook sent successfully
```

**3. Webhook Logs (Terminal 1):**

```
[WEBHOOK] Worker webhook received
[WEBHOOK] Updating generation status in DB
[WEBHOOK] Creating assistant message
[WEBHOOK] Webhook processed successfully
```

---

## 🧪 Testing Commands

### Test 1: Start Everything

```bash
# Terminal 1
cd apps/web && pnpm dev

# Terminal 2
cd workers && npm run dev

# Terminal 3
cd workers && wrangler tail --local
```

### Test 2: Send Video Request

1. Go to your Next.js app (usually http://localhost:3000)
2. Send a message: "Make a 5-second video of ocean waves"
3. Watch all 3 terminals for logs

### Test 3: Check Specific Logs

```bash
# Filter logs by pattern
wrangler tail --local | grep "GENERATION_WORKFLOW"
wrangler tail --local | grep "WEBHOOK"
wrangler tail --local | grep "ERROR"
```

---

## 🚨 Troubleshooting Logs

### If No Worker Logs Appear:

```bash
# Check if worker is running
curl http://localhost:8787/health

# Restart worker
cd workers
npm run dev
```

### If Webhook Logs Don't Appear:

1. Check `NEXTJS_URL` in `.dev.vars`
2. Ensure Next.js is running on correct port
3. Check webhook endpoint exists: `apps/web/src/app/api/webhooks/worker/route.ts`

### If Logs Are Too Verbose:

```bash
# Filter specific logs
wrangler tail --local | grep "\[GENERATION"
wrangler tail --local | grep "\[WEBHOOK"
wrangler tail --local | grep "\[ERROR"
```

---

## 📝 Log Format

All logs follow this structured format:

```json
{
  "requestId": "gen_1234567890_abc123",
  "generationId": "gen_1234567890_xyz789",
  "userId": "user_123",
  "timestamp": "2025-10-14T12:34:56.789Z",
  "message": "Specific action description"
}
```

---

## 🎯 Success Indicators

### ✅ Everything Working:

```
[GENERATION_CREATE] Request received
[BACKGROUND_PROCESSING] Starting generation
[GENERATION_WORKFLOW] Starting generation
[VEO3_SERVICE] Starting video generation
[WEBHOOK] Sending webhook
[WEBHOOK] Worker webhook received
[WEBHOOK] Webhook processed successfully
```

### ❌ Common Issues:

```
# Worker not responding
[GENERATION_CREATE] Worker call failed

# Webhook not reaching Next.js
[WEBHOOK] Failed to send webhook

# Generation workflow errors
[GENERATION_WORKFLOW] Generation workflow start error
```

---

## 🔧 Advanced Debugging

### Enable Verbose Logging:

```bash
# Set debug environment
export DEBUG=true
wrangler tail --local
```

### Save Logs to File:

```bash
# Save worker logs
wrangler tail --local > worker-logs.txt

# Save Next.js logs
cd apps/web && pnpm dev > nextjs-logs.txt 2>&1
```

### Real-time Log Monitoring:

```bash
# Watch multiple log sources
tail -f worker-logs.txt nextjs-logs.txt
```

---

## 🎉 Ready to Test!

1. **Start all 3 terminals** with the commands above
2. **Send a video request** through your app
3. **Watch the logs flow** through all terminals
4. **Look for the success pattern** in the logs

The logs will tell you exactly where any issues occur! 🚀
