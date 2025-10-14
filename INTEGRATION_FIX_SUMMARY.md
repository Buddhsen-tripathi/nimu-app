# Worker-Next.js Integration Fix - Summary

## What Was Done

### 1. Created Comprehensive Debugging Plan

- **File**: `DEBUGGING_PLAN.md`
- Contains:
  - Detailed ideal flow diagrams
  - Database changes at each step
  - Worker state changes
  - Comprehensive logging strategy
  - Implementation checklist
  - Debugging steps
  - Common issues & solutions

### 2. Created Webhook Endpoint

- **File**: `apps/web/src/app/api/webhooks/worker/route.ts`
- **Purpose**: Receive updates from Cloudflare Worker when generation completes
- **Features**:
  - Validates webhook payload
  - Updates generation status in DB
  - Creates assistant message with result
  - Comprehensive logging at every step
  - Error handling

### 3. Added Comprehensive Logging

- **Files Modified**:
  - `apps/web/src/app/api/generations/route.ts`
  - `apps/web/src/app/api/generations/[id]/status/route.ts`
- **Features**:
  - Request IDs for tracking
  - Timestamps at every step
  - Processing time tracking
  - Error logging with stack traces
  - Structured log format: `[COMPONENT] Action`

---

## Current State

### ✅ What's Working

1. Generation creation in database
2. Worker API integration
3. Comprehensive logging in Next.js API routes
4. Webhook endpoint ready to receive updates

### ❌ What's Missing (Next Steps)

#### 1. Worker Needs to Send Webhooks

The Cloudflare Worker needs to be updated to send webhooks to Next.js when:

- Generation starts processing
- Generation progress updates
- Generation completes
- Generation fails

**Location**: `workers/src/services/GenerationWorkflow.ts`

**Example Code Needed**:

```typescript
// After generation completes
await sendWebhook({
  event: "generation.completed",
  jobId: jobId,
  generationId: generationId,
  userId: userId,
  status: "completed",
  result: {
    videoUrl: videoUrl,
    thumbnailUrl: thumbnailUrl,
    duration: duration,
    fileSize: fileSize,
    resolution: resolution,
    format: format,
    processingTime: processingTime,
  },
  timestamp: new Date().toISOString(),
});

// Helper function to send webhook
async function sendWebhook(data: any) {
  const webhookUrl = `${process.env.NEXTJS_URL}/api/webhooks/worker`;

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status}`);
    }

    console.log("[WEBHOOK] Webhook sent successfully", {
      event: data.event,
      generationId: data.generationId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[WEBHOOK] Failed to send webhook", {
      event: data.event,
      generationId: data.generationId,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });
    // Implement retry logic here
  }
}
```

#### 2. Frontend Needs to Poll for Status

The frontend needs to poll the status endpoint to get updates.

**Create**: `apps/web/src/hooks/useGenerationStatus.ts`

```typescript
import { useEffect, useState } from "react";

export function useGenerationStatus(generationId: string | null) {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!generationId) return;

    const pollInterval = setInterval(async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/generations/${generationId}/status`);
        const data = await response.json();
        setStatus(data);
        setError(null);

        // Stop polling if status is terminal
        if (
          ["completed", "failed", "cancelled"].includes(data.generation?.status)
        ) {
          clearInterval(pollInterval);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(pollInterval);
  }, [generationId]);

  return { status, loading, error };
}
```

**Usage in Component**:

```typescript
const { status, loading, error } = useGenerationStatus(generationId);

useEffect(() => {
  if (status?.generation?.status === "completed") {
    // Show video player
    console.log("Video ready!", status.generation.resultUrl);
  }
}, [status]);
```

#### 3. Add Logging to Worker

Add comprehensive logging to Worker files:

**Files to Update**:

- `workers/src/worker.ts`
- `workers/src/durable-objects/JobManager.ts`
- `workers/src/durable-objects/QueueManager.ts`
- `workers/src/services/GenerationWorkflow.ts`
- `workers/src/services/Veo3Service.ts`

**Example Logging Format**:

```typescript
console.log("[COMPONENT] Action", {
  // Context data
  id: "...",
  userId: "...",
  status: "...",
  // Timing
  timestamp: new Date().toISOString(),
  // Additional data
  ...otherData,
});
```

---

## How to Debug the Current Issue

### Step 1: Enable Logging

1. Start Next.js dev server: `pnpm dev`
2. Start Worker: `cd workers && npm run dev`
3. Monitor both console outputs

### Step 2: Test Generation Creation

1. Send a message requesting video generation
2. Check Next.js logs for:
   - `[GENERATION_CREATE] Request received`
   - `[GENERATION_CREATE] Generation created in DB`
   - `[GENERATION_CREATE] Calling Worker API`
   - `[GENERATION_CREATE] Worker response`
   - `[GENERATION_CREATE] Returning response`

3. Check Worker logs for:
   - `[WORKER] Request received`
   - `[JOB_MANAGER] Creating job`
   - `[JOB_MANAGER] Job created`

### Step 3: Verify Database

Check the `generation` table:

```sql
SELECT id, status, created_at, updated_at
FROM generation
ORDER BY created_at DESC
LIMIT 1;
```

Expected status: `pending_clarification`

### Step 4: Check Worker Status

Query the Worker status endpoint:

```bash
curl http://localhost:8787/api/generations/{generationId}
```

### Step 5: Monitor for Webhooks

Watch Next.js logs for:

```
[WEBHOOK] Worker webhook received
[WEBHOOK] Processing webhook
[WEBHOOK] Generation updated
[WEBHOOK] Assistant message created
```

---

## Testing Checklist

### Phase 1: Generation Creation

- [ ] User sends message requesting video
- [ ] Generation created in DB with status `pending_clarification`
- [ ] Worker receives request and creates job
- [ ] Next.js returns response to frontend
- [ ] Frontend displays "Generating video..."

### Phase 2: Clarification (If Needed)

- [ ] User answers clarification questions
- [ ] Status updates to `pending_confirmation`
- [ ] User confirms generation
- [ ] Status updates to `confirmed`

### Phase 3: Processing

- [ ] Worker starts processing
- [ ] Status updates to `processing`
- [ ] Worker calls Veo3 API
- [ ] Video generated
- [ ] Video uploaded to R2
- [ ] Worker sends webhook to Next.js

### Phase 4: Completion

- [ ] Next.js receives webhook
- [ ] Generation status updates to `completed`
- [ ] Assistant message created with video
- [ ] Frontend polls and shows video
- [ ] User sees completed video

---

## Environment Variables Needed

### Next.js (.env.local)

```env
# Cloudflare Worker
WORKER_URL=http://localhost:8787
WORKER_API_KEY=dev_key

# Database
DATABASE_URL=postgresql://...

# Webhook URL (for Worker to call)
NEXTJS_URL=http://localhost:3000
```

### Worker (.dev.vars)

```env
# Veo3 API
VEO3_API_KEY=your_veo3_key

# Next.js Webhook URL
NEXTJS_URL=http://localhost:3000

# R2 Storage
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=your_bucket_name
```

---

## Common Issues & Solutions

### Issue 1: Generation created but no response

**Cause**: Worker not sending webhook or webhook not implemented
**Solution**:

1. Implement webhook sending in Worker
2. Verify webhook URL is correct
3. Check Next.js logs for webhook reception

### Issue 2: Worker completes but DB not updated

**Cause**: Webhook not sent or failed
**Solution**:

1. Check Worker logs for webhook call
2. Check Next.js logs for webhook reception
3. Add retry logic for webhook failures

### Issue 3: Frontend not showing updates

**Cause**: Frontend not polling or polling interval too long
**Solution**:

1. Implement polling in frontend
2. Reduce polling interval to 5 seconds
3. Clear cache and refresh

### Issue 4: Webhook authentication fails

**Cause**: Missing or incorrect API key
**Solution**:

1. Add API key to Worker config
2. Verify API key in Next.js webhook handler
3. Update environment variables

---

## Next Steps (Priority Order)

### 1. Immediate (Critical)

- [ ] Add webhook sending to Worker's GenerationWorkflow service
- [ ] Add comprehensive logging to Worker files
- [ ] Test webhook reception in Next.js

### 2. Short-term (High Priority)

- [ ] Implement frontend polling for status updates
- [ ] Add error handling for webhook failures
- [ ] Add retry logic for failed webhooks

### 3. Medium-term (Important)

- [ ] Add WebSocket support for real-time updates
- [ ] Implement progress updates during generation
- [ ] Add user notifications for completion

### 4. Long-term (Nice to Have)

- [ ] Add analytics and monitoring
- [ ] Implement job queuing UI
- [ ] Add generation history view

---

## Files to Modify Next

### High Priority

1. `workers/src/services/GenerationWorkflow.ts` - Add webhook sending
2. `workers/src/durable-objects/JobManager.ts` - Add logging
3. `workers/src/worker.ts` - Add logging
4. `apps/web/src/hooks/useGenerationStatus.ts` - Create polling hook

### Medium Priority

5. `workers/src/services/Veo3Service.ts` - Add logging
6. `workers/src/durable-objects/QueueManager.ts` - Add logging
7. Frontend components - Add polling logic

---

## Support & Debugging

### Logs to Check

1. **Next.js Console**: Look for `[GENERATION_CREATE]`, `[GENERATION_STATUS]`, `[WEBHOOK]`
2. **Worker Console**: Look for `[WORKER]`, `[JOB_MANAGER]`, `[GENERATION_WORKFLOW]`
3. **Database**: Check `generation` table for status updates

### Debug Commands

```bash
# Check Next.js logs
pnpm dev

# Check Worker logs
cd workers && npm run dev

# Check database
psql $DATABASE_URL -c "SELECT * FROM generation ORDER BY created_at DESC LIMIT 5;"

# Test webhook endpoint
curl -X POST http://localhost:3000/api/webhooks/worker \
  -H "Content-Type: application/json" \
  -d '{"event":"generation.completed","jobId":"test","generationId":"test","userId":"test","status":"completed","timestamp":"2024-01-01T00:00:00Z"}'
```

---

## Success Criteria

The integration is working correctly when:

1. ✅ User sends message requesting video
2. ✅ Generation created in DB with status `pending_clarification`
3. ✅ Worker creates job and starts processing
4. ✅ Worker sends webhook when completed
5. ✅ Next.js receives webhook and updates DB
6. ✅ Next.js creates assistant message with video
7. ✅ Frontend polls and displays completed video
8. ✅ All steps are logged with timestamps
9. ✅ User sees the generated video

---

## Questions or Issues?

If you encounter any issues:

1. Check the logs (Next.js and Worker consoles)
2. Verify environment variables are set correctly
3. Check database for generation status
4. Test webhook endpoint manually
5. Review the DEBUGGING_PLAN.md for detailed troubleshooting

---

## Summary

You now have:

- ✅ Comprehensive debugging plan
- ✅ Webhook endpoint to receive Worker updates
- ✅ Comprehensive logging in Next.js API routes
- ✅ Clear documentation of the ideal flow
- ✅ Step-by-step debugging guide
- ✅ Implementation checklist

**Next Action**: Implement webhook sending in the Worker's GenerationWorkflow service and add logging throughout the Worker codebase.
