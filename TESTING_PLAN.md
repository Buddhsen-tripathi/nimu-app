# 🧪 **Cloudflare Worker Migration Testing Plan**

This guide will walk you through testing your migrated system step-by-step, from creating a chat to generating videos.

## 📋 **Prerequisites**

Before starting, ensure you have:

- [ ] Cloudflare Worker deployed: `https://nimu-generation-worker.amaanrizvi73.workers.dev`
- [ ] Worker health check passing
- [ ] Database migration completed
- [ ] Environment variables configured
- [ ] Next.js app running locally

---

## 🚀 **Step 1: Environment Setup**

### 1.1 Create `.env.local` file

```bash
# In apps/web/.env.local
CLOUDFLARE_WORKER_URL="https://nimu-generation-worker.amaanrizvi73.workers.dev"
CLOUDFLARE_WORKER_API_KEY="optional-api-key-for-worker-auth"
CLOUDFLARE_WORKER_TIMEOUT="30000"
CLOUDFLARE_WORKER_RETRY_ATTEMPTS="3"
CLOUDFLARE_WORKER_RETRY_DELAY="1000"

# Veo3 API (if you have it)
VEO3_API_KEY="your-veo3-api-key"
VEO3_BASE_URL="https://api.veo3.com"
```

### 1.2 Start Next.js Development Server

```bash
cd apps/web
pnpm dev
```

### 1.3 Verify Worker Health

```bash
curl https://nimu-generation-worker.amaanrizvi73.workers.dev/health
```

**Expected Response:**

```json
{
  "status": "healthy",
  "timestamp": "2025-10-12T19:23:39.510Z",
  "environment": "development",
  "services": {
    "durableObjects": "available",
    "r2Storage": "available"
  }
}
```

---

## 🎯 **Step 2: Authentication & User Setup**

### 2.1 Test User Authentication

1. Open your Next.js app: `http://localhost:3000`
2. Sign up or log in with your existing account
3. Verify you can access the dashboard

### 2.2 Verify Session

Check that your user session is working:

- User ID is available
- Authentication cookies are set
- Dashboard loads without errors

---

## 💬 **Step 3: Chat & Conversation Testing**

### 3.1 Create New Conversation

1. Navigate to the dashboard
2. Click "New Chat" or similar button
3. Verify conversation is created in the database
4. Check that conversation ID is generated

### 3.2 Send Initial Message

1. Type a simple message: "Hello, I want to create a video"
2. Send the message
3. Verify message is saved to database
4. Check message appears in UI

### 3.3 Verify Database State

Check your database has:

- New conversation record
- New message record
- Proper user association

---

## 🎬 **Step 4: Video Generation Flow Testing**

### 4.1 Request Video Generation

1. In your chat, type a video generation request:
   ```
   "Create a video of a sunset over mountains, 30 seconds long"
   ```
2. Submit the request

### 4.2 Verify Generation Creation

Check that:

- Generation record is created in database
- Status is `pending_clarification`
- Request is sent to Cloudflare Worker

### 4.3 Test Worker Communication

Verify the Worker receives the request:

```bash
# Check Worker logs
cd workers
npx wrangler tail
```

### 4.4 Test Clarification Flow

1. If clarification is required, answer the questions
2. Submit clarification responses
3. Verify status changes to `pending_confirmation`

### 4.5 Test Confirmation Flow

1. Confirm the generation request
2. Verify status changes to `queued`
3. Check `workerJobId` is set in database

---

## 🔄 **Step 5: Queue & Processing Testing**

### 5.1 Check Queue Status

Test the queue status endpoint:

```bash
curl -X GET "http://localhost:3000/api/queue/status" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 5.2 Monitor Job Processing

1. Check generation status updates
2. Verify Worker processes the job
3. Monitor status progression: `queued` → `processing` → `completed`

### 5.3 Test Real-time Updates

Verify that:

- UI updates in real-time
- Status changes are reflected immediately
- No polling errors occur

---

## 📁 **Step 6: Storage Testing**

### 6.1 Test Video Upload

1. When generation completes, verify video is uploaded to R2
2. Check video metadata is stored
3. Verify video URL is generated

### 6.2 Test Video Access

```bash
# Test video listing
curl -X GET "http://localhost:3000/api/storage/videos" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test video URL generation
curl -X GET "http://localhost:3000/api/storage/videos/VIDEO_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 6.3 Test Video Deletion

```bash
# Test video deletion
curl -X DELETE "http://localhost:3000/api/storage/videos/VIDEO_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🛠️ **Step 7: Error Handling Testing**

### 7.1 Test Invalid Requests

1. Send malformed generation requests
2. Test with missing required fields
3. Verify proper error responses

### 7.2 Test Worker Failures

1. Temporarily break Worker connection
2. Verify graceful degradation
3. Check error handling in UI

### 7.3 Test Database Errors

1. Test with invalid user IDs
2. Verify proper error messages
3. Check error logging

---

## 📊 **Step 8: Performance Testing**

### 8.1 Load Testing

1. Create multiple concurrent generations
2. Monitor Worker performance
3. Check database response times

### 8.2 Stress Testing

1. Send many requests quickly
2. Monitor queue processing
3. Verify system stability

---

## 🔍 **Step 9: Monitoring & Debugging**

### 9.1 Worker Logs

```bash
# Monitor Worker logs in real-time
cd workers
npx wrangler tail --format=pretty
```

### 9.2 Database Monitoring

Check your database for:

- Generation records
- Message records
- Queue status
- Error logs

### 9.3 Browser DevTools

Monitor:

- Network requests to Worker
- API response times
- Error messages in console

---

## ✅ **Step 10: Full Flow Validation**

### 10.1 Complete End-to-End Test

1. **Create Account** → Sign up/login
2. **Start Chat** → Create new conversation
3. **Send Message** → "Create a video of ocean waves"
4. **Clarification** → Answer any questions
5. **Confirmation** → Confirm generation
6. **Processing** → Wait for completion
7. **Video Access** → View/download generated video

### 10.2 Verify All Components

- [ ] Authentication working
- [ ] Chat creation working
- [ ] Message sending working
- [ ] Generation request working
- [ ] Worker communication working
- [ ] Queue processing working
- [ ] Video storage working
- [ ] UI updates working
- [ ] Error handling working

---

## 🚨 **Troubleshooting Guide**

### Common Issues & Solutions

#### Worker Not Responding

```bash
# Check Worker status
curl https://nimu-generation-worker.amaanrizvi73.workers.dev/health

# Restart Worker if needed
cd workers && npx wrangler deploy
```

#### Database Connection Issues

```bash
# Test database connection
DATABASE_URL="your-db-url" node scripts/fix-database.js
```

#### API Authentication Issues

- Check session cookies
- Verify JWT tokens
- Test with Postman/curl

#### Generation Stuck in Queue

- Check Worker logs
- Verify Veo3 API key
- Check Durable Objects status

---

## 📝 **Testing Checklist**

### Pre-Testing

- [ ] Environment variables set
- [ ] Worker deployed and healthy
- [ ] Database migrated
- [ ] Next.js app running

### Core Functionality

- [ ] User authentication
- [ ] Chat creation
- [ ] Message sending
- [ ] Generation requests
- [ ] Worker communication
- [ ] Queue processing
- [ ] Video storage
- [ ] Real-time updates

### Error Scenarios

- [ ] Invalid requests
- [ ] Network failures
- [ ] Database errors
- [ ] Worker timeouts

### Performance

- [ ] Response times
- [ ] Concurrent requests
- [ ] Memory usage
- [ ] Database performance

---

## 🎯 **Success Criteria**

Your migration is successful when:

1. ✅ **All API endpoints respond correctly**
2. ✅ **Worker processes jobs without errors**
3. ✅ **Videos are generated and stored in R2**
4. ✅ **Real-time updates work in UI**
5. ✅ **Error handling works gracefully**
6. ✅ **Performance is acceptable**
7. ✅ **No BullMQ dependencies remain**

---

## 📞 **Getting Help**

If you encounter issues:

1. **Check Worker logs**: `npx wrangler tail`
2. **Verify database**: Check generation records
3. **Test API endpoints**: Use curl or Postman
4. **Check browser console**: Look for JavaScript errors
5. **Review migration guide**: `apps/web/MIGRATION_GUIDE.md`

---

**Happy Testing! 🚀**

This plan ensures your Cloudflare Worker migration is working perfectly before going live.
