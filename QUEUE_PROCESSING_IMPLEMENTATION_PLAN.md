# Queue Processing Implementation Plan

## Current State Analysis

### What You Already Have ✅

1. **Durable Objects Infrastructure**
   - `JobManager` - Manages individual job state
   - `QueueManager` - Manages job queue (FIFO)
   - `DurableObjectManager` - Helper class with methods:
     - `createAndQueueJob()` - Creates job and adds to queue
     - `processJob()` - Gets next job from queue
     - `completeJobProcessing()` - Completes job processing

2. **Generation Processing**
   - `GenerationWorkflow` - Complete workflow for video generation
   - `Veo3Service` - Integrates with Veo3 API
   - `VideoStorageHelper` - Handles R2 storage

3. **Worker Infrastructure**
   - HTTP request handler
   - Scheduled cron handler (for cleanup)
   - Authentication and validation

### What's Missing ❌

1. **No Connection Between Queue and Processing**
   - Jobs are added to queue ✅
   - Jobs sit in queue forever ❌
   - Nothing processes them ❌

2. **No Webhook Sending**
   - Generation completes ✅
   - No notification to Next.js ❌

3. **No Logging**
   - No comprehensive logging in Worker
   - Can't trace what's happening

---

## Implementation Plan: Phase 1 (Immediate Processing)

### Goal

**When a job is added to the queue, immediately start processing it**

### Changes Needed

#### 1. Modify Worker Generation Route

**File**: `workers/src/worker.ts`

**Current Code** (Line ~346):

```typescript
// Create job and add to queue
const result = await durableObjectManager.createAndQueueJob({
  id: generationData.id,
  generationId: generationData.id,
  userId,
  prompt: (generationData as any).prompt,
  parameters: (generationData as any).parameters || {},
  provider: (generationData as any).provider,
  model: (generationData as any).model,
  priority: (generationData as any).priority || 0,
  createdAt: new Date(),
  updatedAt: new Date(),
});

// ❌ NOTHING HAPPENS AFTER THIS
```

**New Code**:

```typescript
// Create job and add to queue
const result = await durableObjectManager.createAndQueueJob({
  id: generationData.id,
  generationId: generationData.id,
  userId,
  prompt: (generationData as any).prompt,
  parameters: (generationData as any).parameters || {},
  provider: (generationData as any).provider,
  model: (generationData as any).model,
  priority: (generationData as any).priority || 0,
  createdAt: new Date(),
  updatedAt: new Date(),
});

// ✅ START PROCESSING IMMEDIATELY
if (result.success) {
  // Trigger background processing
  _ctx.waitUntil(
    processGenerationInBackground(
      generationData.id,
      userId,
      (generationData as any).prompt,
      (generationData as any).parameters,
      durableObjectManager,
      videoStorage,
      env
    )
  );
}
```

#### 2. Create Background Processing Function

**File**: `workers/src/worker.ts`

**New Function**:

```typescript
/**
 * Process generation in background
 */
async function processGenerationInBackground(
  generationId: string,
  userId: string,
  prompt: string,
  parameters: any,
  durableObjectManager: DurableObjectManager,
  videoStorage: VideoStorageHelper,
  env: Env
): Promise<void> {
  const requestId = `bg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    console.log("[BACKGROUND_PROCESSING] Starting generation", {
      requestId,
      generationId,
      userId,
      timestamp: new Date().toISOString(),
    });

    // Initialize GenerationWorkflow
    const workflow = new GenerationWorkflow(
      {
        veo3ApiKey: env.VEO3_API_KEY!,
        maxRetries: 3,
        pollingInterval: 5000,
        timeoutMs: 300000,
        enableClarifications: false,
        enableProgressTracking: true,
      },
      durableObjectManager,
      videoStorage
    );

    // Start generation
    const result = await workflow.startGeneration(userId, prompt, parameters);

    console.log("[BACKGROUND_PROCESSING] Generation workflow completed", {
      requestId,
      generationId,
      success: result.success,
      timestamp: new Date().toISOString(),
    });

    // Send webhook to Next.js
    if (result.success && result.videoUrl) {
      await sendWebhookToNextJS({
        event: "generation.completed",
        jobId: generationId,
        generationId: generationId,
        userId: userId,
        status: "completed",
        result: {
          videoUrl: result.videoUrl,
          duration: parameters.duration,
          processingTime: result.processingTime,
        },
        timestamp: new Date().toISOString(),
      });
    } else if (!result.success) {
      await sendWebhookToNextJS({
        event: "generation.failed",
        jobId: generationId,
        generationId: generationId,
        userId: userId,
        status: "failed",
        error: result.error,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("[BACKGROUND_PROCESSING] Error", {
      requestId,
      generationId,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });

    // Send failure webhook
    await sendWebhookToNextJS({
      event: "generation.failed",
      jobId: generationId,
      generationId: generationId,
      userId: userId,
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });
  }
}
```

#### 3. Create Webhook Sending Function

**File**: `workers/src/worker.ts`

**New Function**:

```typescript
/**
 * Send webhook to Next.js
 */
async function sendWebhookToNextJS(data: any): Promise<void> {
  const webhookUrl = `${env.NEXTJS_URL}/api/webhooks/worker`;

  try {
    console.log("[WEBHOOK] Sending webhook", {
      event: data.event,
      generationId: data.generationId,
      webhookUrl,
      timestamp: new Date().toISOString(),
    });

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
    // TODO: Implement retry logic
  }
}
```

#### 4. Add Environment Variable

**File**: `workers/wrangler.toml`

```toml
[vars]
NEXTJS_URL = "https://your-nextjs-app.vercel.app"
```

**File**: `workers/.dev.vars`

```env
NEXTJS_URL=http://localhost:3000
```

#### 5. Add Logging to GenerationWorkflow

**File**: `workers/src/services/GenerationWorkflow.ts`

Add logging at key points:

- Start of generation
- Veo3 API calls
- Video upload to R2
- Completion
- Errors

---

## Implementation Plan: Phase 2 (Future Upgrade - Proper Queue Processing)

### When to Upgrade

Upgrade when you have:

- **High volume**: 10+ concurrent video generation requests
- **Rate limiting issues**: Veo3 API rate limits being hit
- **Need for prioritization**: VIP users need faster processing
- **Better control**: Want to control how many jobs run at once

### Upgrade Options

#### Option A: Scheduled Cron Job (Recommended for Medium Volume)

**How it works**:

```
Every minute:
  1. Cron triggers Worker
  2. Worker checks queue
  3. Worker gets next job
  4. Worker processes it
  5. Worker completes
  6. Wait for next minute
```

**Implementation**:

1. **Add cron trigger to wrangler.toml**:

```toml
[[triggers]]
crons = ["* * * * *"]  # Every minute
```

2. **Modify scheduled handler in worker.ts**:

```typescript
async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
  console.log('[CRON] Processing queue', { timestamp: new Date().toISOString() });

  const durableObjectManager = new DurableObjectManager(env);
  const videoStorage = new VideoStorageHelper(env);

  // Process one job from queue
  const result = await durableObjectManager.processJob('cron-worker');

  if (result.success && result.job) {
    // Process the job
    await processJobFromQueue(result.job, durableObjectManager, videoStorage, env);
  }
}
```

**Pros**:

- Simple to implement
- Sequential processing (one job per minute)
- No additional infrastructure
- Built into Cloudflare Workers

**Cons**:

- Jobs wait up to 1 minute before processing
- Not real-time

**Best for**: 1-10 jobs per minute

---

#### Option B: Alarm API (Recommended for High Volume)

**How it works**:

```
Job added to queue → Set alarm for immediate processing → Alarm fires → Process job → Set alarm for next job
```

**Implementation**:

1. **Modify QueueManager Durable Object**:

```typescript
async addToQueue(jobData: any) {
  // Add job to queue
  this.queue.push(jobData);

  // Set alarm to process this job immediately
  await this.state.storage.setAlarm(Date.now() + 1000); // 1 second delay

  return { success: true, queuePosition: this.queue.length };
}

async alarm() {
  // Alarm fired - process next job in queue
  if (this.queue.length > 0) {
    const job = this.queue.shift();
    // Trigger processing
    await this.processJob(job);

    // Set alarm for next job if queue not empty
    if (this.queue.length > 0) {
      await this.state.storage.setAlarm(Date.now() + 1000);
    }
  }
}
```

**Pros**:

- More real-time (jobs start within 1 second)
- Sequential processing
- No polling needed
- Efficient

**Cons**:

- Slightly more complex
- Need to manage alarms

**Best for**: 10-100 jobs per minute

---

#### Option C: Cloudflare Queues (Recommended for Very High Volume)

**How it works**:

```
Job added → Cloudflare Queue → Consumer Worker → Process job
```

**Implementation**:

1. **Add queue to wrangler.toml**:

```toml
[[queues.producers]]
queue = "generation-queue"
binding = "GENERATION_QUEUE"

[[queues.consumers]]
queue = "generation-queue"
max_batch_size = 1
max_batch_timeout = 30
```

2. **Add queue consumer handler**:

```typescript
async queue(batch: MessageBatch, env: Env): Promise<void> {
  for (const message of batch.messages) {
    const job = message.body;
    await processJobFromQueue(job, durableObjectManager, videoStorage, env);
    message.ack();
  }
}
```

**Pros**:

- Built for high volume
- Automatic scaling
- Built-in retry logic
- Best performance

**Cons**:

- Most complex
- Requires Cloudflare Queues (paid feature)
- Overkill for low volume

**Best for**: 100+ jobs per minute

---

## Comparison Matrix

| Feature         | Immediate Processing | Cron Job         | Alarm API         | Cloudflare Queues |
| --------------- | -------------------- | ---------------- | ----------------- | ----------------- |
| **Complexity**  | Low                  | Low              | Medium            | High              |
| **Setup Time**  | 30 min               | 1 hour           | 2 hours           | 4 hours           |
| **Real-time**   | Yes                  | No (1 min delay) | Yes (1 sec delay) | Yes               |
| **Sequential**  | No                   | Yes              | Yes               | Yes               |
| **Scalability** | Low                  | Medium           | Medium            | High              |
| **Cost**        | Free                 | Free             | Free              | Paid              |
| **Best For**    | < 10 jobs/min        | 10-50 jobs/min   | 50-100 jobs/min   | 100+ jobs/min     |

---

## Migration Path

### Current → Phase 1 (Immediate Processing)

**Time**: 1-2 hours
**Effort**: Low
**Risk**: Low

### Phase 1 → Phase 2A (Cron Job)

**Time**: 2-3 hours
**Effort**: Low
**Risk**: Low
**Changes**:

- Add cron trigger
- Modify scheduled handler
- Remove immediate processing

### Phase 1 → Phase 2B (Alarm API)

**Time**: 4-6 hours
**Effort**: Medium
**Risk**: Medium
**Changes**:

- Add alarm handler to QueueManager
- Modify addToQueue to set alarms
- Remove immediate processing

### Phase 1 → Phase 2C (Cloudflare Queues)

**Time**: 8-12 hours
**Effort**: High
**Risk**: High
**Changes**:

- Add queue bindings
- Add queue consumer handler
- Migrate from Durable Objects queue to Cloudflare Queue
- Remove immediate processing

---

## Testing Strategy

### Phase 1 Testing

1. **Test Immediate Processing**
   - Send 1 video generation request
   - Verify job is processed immediately
   - Verify webhook is sent
   - Verify Next.js receives webhook
   - Verify frontend shows video

2. **Test Multiple Requests**
   - Send 3 video generation requests quickly
   - Verify all 3 start processing
   - Verify all 3 complete
   - Verify all 3 send webhooks

3. **Test Error Handling**
   - Send invalid request
   - Verify error is handled
   - Verify failure webhook is sent

### Phase 2 Testing (When Upgrading)

1. **Test Queue Processing**
   - Add 5 jobs to queue
   - Verify jobs process sequentially
   - Verify no jobs are skipped
   - Verify FIFO order

2. **Test Rate Limiting**
   - Send 10 requests
   - Verify no API overload
   - Verify jobs complete successfully

3. **Test Failure Recovery**
   - Simulate Veo3 API failure
   - Verify job is retried
   - Verify failure webhook is sent

---

## Monitoring & Metrics

### Key Metrics to Track

1. **Queue Metrics**
   - Jobs in queue
   - Average wait time
   - Jobs processed per minute
   - Jobs failed per minute

2. **Processing Metrics**
   - Average processing time
   - Success rate
   - Failure rate
   - Retry rate

3. **API Metrics**
   - Veo3 API calls per minute
   - Veo3 API errors
   - Rate limit hits

4. **Webhook Metrics**
   - Webhooks sent
   - Webhook failures
   - Webhook retries

### Logging Strategy

**Use structured logging**:

```typescript
console.log("[COMPONENT] Action", {
  // Context
  id: "...",
  userId: "...",
  // Timing
  timestamp: new Date().toISOString(),
  duration: 123,
  // Additional data
  ...otherData,
});
```

**Log Levels**:

- `[INFO]` - Normal operations
- `[WARN]` - Recoverable errors
- `[ERROR]` - Failures
- `[DEBUG]` - Detailed debugging

---

## Rollback Plan

### If Phase 1 Fails

**Rollback Steps**:

1. Revert worker.ts changes
2. Redeploy Worker
3. Test generation creation
4. Debug issues
5. Re-deploy with fixes

**Rollback Time**: 5 minutes

### If Phase 2 Upgrade Fails

**Rollback Steps**:

1. Revert to Phase 1 code
2. Redeploy Worker
3. Verify queue processing stops
4. Verify immediate processing works
5. Debug Phase 2 issues
6. Re-deploy Phase 2 with fixes

**Rollback Time**: 10 minutes

---

## Success Criteria

### Phase 1 Success

- [ ] Job added to queue
- [ ] Job starts processing immediately
- [ ] Video is generated
- [ ] Webhook is sent to Next.js
- [ ] Next.js receives webhook
- [ ] Generation status updated in DB
- [ ] Assistant message created
- [ ] Frontend shows video
- [ ] All steps are logged

### Phase 2 Success

- [ ] Jobs process sequentially (FIFO)
- [ ] No API overload
- [ ] Jobs complete successfully
- [ ] No jobs are lost
- [ ] No jobs are stuck
- [ ] Webhooks are sent
- [ ] All steps are logged

---

## Cost Analysis

### Current Setup (Phase 1)

- **Durable Objects**: ~$0.15 per million requests
- **Worker Requests**: ~$5 per million requests
- **R2 Storage**: ~$0.015 per GB
- **Estimated Cost**: $10-20/month for 1000 generations

### Phase 2 (Cron Job)

- **Same as Phase 1** (no additional cost)

### Phase 2 (Alarm API)

- **Same as Phase 1** (no additional cost)

### Phase 2 (Cloudflare Queues)

- **Queue Requests**: ~$0.40 per million requests
- **Additional Cost**: ~$5-10/month for 1000 generations
- **Total Cost**: $15-30/month for 1000 generations

---

## Next Steps

### Immediate (Phase 1)

1. **Add environment variable** `NEXTJS_URL`
2. **Create background processing function**
3. **Create webhook sending function**
4. **Modify generation route** to trigger background processing
5. **Add logging** to GenerationWorkflow
6. **Test** complete flow
7. **Deploy** to production

### Future (Phase 2)

**When to upgrade**:

- You have 10+ concurrent requests
- Veo3 API rate limits are being hit
- Users complain about slow processing
- You want better control

**Upgrade path**:

1. Start with Cron Job (easiest)
2. If still not enough, move to Alarm API
3. If still not enough, move to Cloudflare Queues

---

## Questions to Answer Before Implementing

1. **What's your expected volume?**
   - < 10 jobs/min → Phase 1 is fine
   - 10-50 jobs/min → Upgrade to Cron Job
   - 50-100 jobs/min → Upgrade to Alarm API
   - 100+ jobs/min → Upgrade to Cloudflare Queues

2. **What's your acceptable delay?**
   - Immediate → Phase 1 or Alarm API
   - 1 minute delay OK → Cron Job

3. **What's your budget?**
   - Free → Phase 1, Cron Job, or Alarm API
   - Paid OK → Cloudflare Queues

4. **What's your priority?**
   - Get it working fast → Phase 1
   - Get it right → Phase 2

---

## Implementation Checklist

### Phase 1 (Immediate Processing)

- [ ] Add `NEXTJS_URL` to environment variables
- [ ] Create `processGenerationInBackground()` function
- [ ] Create `sendWebhookToNextJS()` function
- [ ] Modify generation route to trigger background processing
- [ ] Add logging to GenerationWorkflow
- [ ] Add logging to Veo3Service
- [ ] Test single generation
- [ ] Test multiple generations
- [ ] Test error handling
- [ ] Deploy to production

### Phase 2 (Future Upgrade)

- [ ] Decide on upgrade option (Cron/Alarm/Queue)
- [ ] Implement chosen option
- [ ] Test queue processing
- [ ] Test rate limiting
- [ ] Test failure recovery
- [ ] Monitor metrics
- [ ] Deploy to production

---

## Support & Debugging

### Common Issues

**Issue 1: Jobs not processing**

- Check Worker logs for background processing
- Check if GenerationWorkflow is being called
- Check Veo3 API logs

**Issue 2: Webhooks not sending**

- Check `NEXTJS_URL` is set correctly
- Check Next.js logs for webhook reception
- Test webhook endpoint manually

**Issue 3: Jobs stuck in queue**

- Check QueueManager logs
- Check if alarm is set (if using Alarm API)
- Check if cron is running (if using Cron Job)

### Debug Commands

```bash
# Check Worker logs
wrangler tail

# Test webhook endpoint
curl -X POST http://localhost:3000/api/webhooks/worker \
  -H "Content-Type: application/json" \
  -d '{"event":"generation.completed","jobId":"test","generationId":"test","userId":"test","status":"completed","timestamp":"2024-01-01T00:00:00Z"}'

# Check queue status
curl http://localhost:8787/api/queue/status

# Check generation status
curl http://localhost:8787/api/generations/{generationId}
```

---

## Conclusion

**Phase 1 (Immediate Processing)** is the right choice for now because:

- ✅ Simple to implement (1-2 hours)
- ✅ Works for low volume (< 10 jobs/min)
- ✅ No additional infrastructure needed
- ✅ Easy to upgrade later

**Phase 2 (Proper Queue Processing)** should be implemented when:

- You have 10+ concurrent requests
- Veo3 API rate limits are being hit
- You want better control over processing

**Recommended upgrade path**:

1. Start with Phase 1 (immediate processing)
2. Monitor for 1-2 weeks
3. If issues arise, upgrade to Phase 2A (Cron Job)
4. If still not enough, upgrade to Phase 2B (Alarm API)
5. If still not enough, upgrade to Phase 2C (Cloudflare Queues)

---

## Files to Modify

### Phase 1 (Immediate Processing)

**High Priority**:

1. `workers/src/worker.ts` - Add background processing
2. `workers/wrangler.toml` - Add NEXTJS_URL
3. `workers/.dev.vars` - Add NEXTJS_URL

**Medium Priority**: 4. `workers/src/services/GenerationWorkflow.ts` - Add logging 5. `workers/src/services/Veo3Service.ts` - Add logging

### Phase 2 (Future Upgrade)

**When upgrading to Cron Job**:

1. `workers/wrangler.toml` - Add cron trigger
2. `workers/src/worker.ts` - Modify scheduled handler

**When upgrading to Alarm API**:

1. `workers/src/durable-objects/QueueManager.ts` - Add alarm handler
2. `workers/src/worker.ts` - Remove immediate processing

**When upgrading to Cloudflare Queues**:

1. `workers/wrangler.toml` - Add queue bindings
2. `workers/src/worker.ts` - Add queue consumer handler
3. `workers/src/worker.ts` - Remove immediate processing

---

## Timeline

### Phase 1 (Immediate Processing)

- **Planning**: 30 minutes
- **Implementation**: 1-2 hours
- **Testing**: 1 hour
- **Deployment**: 30 minutes
- **Total**: 3-4 hours

### Phase 2 (Future Upgrade)

- **Planning**: 1 hour
- **Implementation**: 2-8 hours (depending on option)
- **Testing**: 2 hours
- **Deployment**: 1 hour
- **Total**: 6-12 hours

---

## Success Metrics

### Phase 1 Success

- ✅ Jobs process immediately after creation
- ✅ Videos are generated successfully
- ✅ Webhooks are sent and received
- ✅ Frontend shows completed videos
- ✅ No jobs are stuck in queue
- ✅ All steps are logged

### Phase 2 Success

- ✅ Jobs process sequentially (FIFO)
- ✅ No API overload
- ✅ Jobs complete successfully
- ✅ No jobs are lost
- ✅ No jobs are stuck
- ✅ Webhooks are sent
- ✅ All steps are logged

---

## Final Notes

**Start with Phase 1** - It's simple, works for your current volume, and you can always upgrade later.

**Monitor closely** - Watch for signs that you need Phase 2:

- Jobs taking too long to process
- Veo3 API rate limit errors
- User complaints about slow processing

**Upgrade when needed** - Don't over-engineer. Phase 1 will work fine for 90% of use cases.

**Keep it simple** - Complexity is the enemy of reliability. Start simple, add complexity only when needed.

Good luck! 🚀
