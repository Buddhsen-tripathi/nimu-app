# Video Generation Flow - Debugging Plan & Ideal Flow

## Current Issue

**Problem**: When a user requests video generation:

1. ✅ A new generation record is created in the database
2. ❌ No reply is sent back to the user after that
3. ❌ No status updates are communicated back to the frontend

**Root Cause Analysis**:

- The Next.js app creates a generation and calls the worker
- The worker processes the job in Durable Objects
- **BUT**: There's no mechanism to notify Next.js when the worker completes the job
- **MISSING**: Webhook endpoint in Next.js to receive worker updates
- **MISSING**: Polling mechanism in frontend to check generation status
- **MISSING**: Comprehensive logging throughout the flow

---

## Ideal Flow (How It Should Work)

### Phase 1: User Requests Video Generation

```
┌─────────────┐
│   Frontend  │
│  (User UI)  │
└──────┬──────┘
       │ 1. User types: "Create a video of..."
       │
       ▼
┌──────────────────────────────────────┐
│  Next.js API: POST /api/conversations/[id]/messages │
│  - Creates user message in DB        │
│  - Calls AI to analyze intent        │
│  - Detects video generation request  │
└──────┬───────────────────────────────┘
       │ 2. AI determines: "This is a video generation request"
       │
       ▼
┌──────────────────────────────────────┐
│  Next.js API: POST /api/generations  │
│  - Creates generation record in DB   │
│  - Status: "pending_clarification"   │
│  - Calls Worker API                  │
└──────┬───────────────────────────────┘
       │ 3. HTTP POST to Worker
       │
       ▼
┌──────────────────────────────────────┐
│  Cloudflare Worker                   │
│  POST /api/generations               │
│  - Validates request                 │
│  - Creates job in JobManager DO      │
│  - Adds to QueueManager DO           │
│  - Returns: {generationId, status}   │
└──────┬───────────────────────────────┘
       │ 4. Returns response
       │
       ▼
┌──────────────────────────────────────┐
│  Next.js API Response                │
│  - Returns generation object         │
│  - Includes clarification questions  │
└──────┬───────────────────────────────┘
       │ 5. Response to frontend
       │
       ▼
┌─────────────┐
│   Frontend  │
│  (User UI)  │
│  - Shows: "I'm working on your video" │
│  - Shows clarification questions     │
└─────────────┘
```

### Phase 2: Clarification (If Needed)

```
┌─────────────┐
│   Frontend  │
│  (User UI)  │
└──────┬──────┘
       │ 1. User answers clarification questions
       │
       ▼
┌──────────────────────────────────────┐
│  Next.js API: POST /api/generations/[id]/clarify │
│  - Updates clarification_responses   │
│  - Status: "pending_confirmation"    │
│  - Calls Worker                     │
└──────┬───────────────────────────────┘
       │ 2. HTTP POST to Worker
       │
       ▼
┌──────────────────────────────────────┐
│  Cloudflare Worker                   │
│  POST /api/generations/[id]/clarify  │
│  - Updates job with responses        │
│  - Status: "pending_confirmation"    │
└──────┬───────────────────────────────┘
       │ 3. Returns success
       │
       ▼
┌──────────────────────────────────────┐
│  Next.js API Response                │
│  - Returns updated generation        │
└──────┬───────────────────────────────┘
       │ 4. Response to frontend
       │
       ▼
┌─────────────┐
│   Frontend  │
│  (User UI)  │
│  - Shows confirmation prompt         │
└─────────────┘
```

### Phase 3: User Confirms

```
┌─────────────┐
│   Frontend  │
│  (User UI)  │
└──────┬──────┘
       │ 1. User clicks "Confirm"
       │
       ▼
┌──────────────────────────────────────┐
│  Next.js API: POST /api/generations/[id]/confirm │
│  - Status: "confirmed"               │
│  - Calls Worker                     │
└──────┬───────────────────────────────┘
       │ 2. HTTP POST to Worker
       │
       ▼
┌──────────────────────────────────────┐
│  Cloudflare Worker                   │
│  POST /api/generations/[id]/confirm  │
│  - Updates job status to "confirmed" │
│  - Adds job to processing queue      │
└──────┬───────────────────────────────┘
       │ 3. Job starts processing
       │
       ▼
┌──────────────────────────────────────┐
│  GenerationWorkflow Service          │
│  - Calls Veo3Service                 │
│  - Generates video                   │
│  - Uploads to R2                     │
│  - Updates job status                │
└──────┬───────────────────────────────┘
       │ 4. Job completed
       │
       ▼
┌──────────────────────────────────────┐
│  Webhook: POST /api/webhooks/worker  │
│  - Next.js receives completion       │
│  - Updates generation in DB          │
│  - Status: "completed"               │
│  - Creates assistant message         │
└──────┬───────────────────────────────┘
       │ 5. Frontend polls or receives push
       │
       ▼
┌─────────────┐
│   Frontend  │
│  (User UI)  │
│  - Shows: "Your video is ready!"     │
│  - Displays video player             │
└─────────────┘
```

---

## Database Changes Throughout Flow

### 1. Initial Generation Creation

```sql
INSERT INTO generation (
  id,
  conversation_id,
  message_id,
  user_id,
  type,
  provider,
  model,
  status,
  prompt,
  parameters,
  created_at,
  updated_at
) VALUES (
  'gen_123...',
  'conv_123...',
  'msg_123...',
  'user_123...',
  'video',
  'veo3',
  'veo3-v1.0',
  'pending_clarification',  -- Initial status
  'A video of a sunset...',
  '{"duration": 10, "aspect_ratio": "16:9"}',
  NOW(),
  NOW()
);
```

### 2. After Clarification Submitted

```sql
UPDATE generation
SET
  status = 'pending_confirmation',
  clarification_responses = '{"duration": 10, "style": "cinematic"}',
  updated_at = NOW()
WHERE id = 'gen_123...';
```

### 3. After User Confirms

```sql
UPDATE generation
SET
  status = 'queued',
  worker_job_id = 'job_123...',
  updated_at = NOW()
WHERE id = 'gen_123...';
```

### 4. When Worker Starts Processing

```sql
UPDATE generation
SET
  status = 'processing',
  started_at = NOW(),
  updated_at = NOW()
WHERE id = 'gen_123...';
```

### 5. When Worker Completes

```sql
UPDATE generation
SET
  status = 'completed',
  result_url = 'https://r2.example.com/videos/gen_123.mp4',
  thumbnail_url = 'https://r2.example.com/thumbnails/gen_123.jpg',
  duration = 10,
  file_size = 5242880,
  resolution = '1920x1080',
  format = 'mp4',
  processing_time = 45,
  completed_at = NOW(),
  updated_at = NOW()
WHERE id = 'gen_123...';
```

### 6. If Worker Fails

```sql
UPDATE generation
SET
  status = 'failed',
  error_message = 'Veo3 API timeout',
  failed_at = NOW(),
  updated_at = NOW()
WHERE id = 'gen_123...';
```

---

## Worker Changes Throughout Flow

### 1. JobManager Durable Object State

```typescript
// Initial state when job is created
{
  id: 'job_123...',
  status: 'pending',
  progress: 0,
  data: {
    generationId: 'gen_123...',
    userId: 'user_123...',
    prompt: 'A video of a sunset...',
    parameters: {...},
    provider: 'veo3',
    model: 'veo3-v1.0'
  },
  retryCount: 0,
  maxRetries: 3,
  createdAt: '2024-01-01T12:00:00Z',
  updatedAt: '2024-01-01T12:00:00Z'
}

// After clarification
{
  ...previous,
  status: 'pending_confirmation',
  data: {
    ...previous.data,
    clarificationResponses: {...}
  },
  updatedAt: '2024-01-01T12:05:00Z'
}

// After confirmation
{
  ...previous,
  status: 'confirmed',
  updatedAt: '2024-01-01T12:06:00Z'
}

// During processing
{
  ...previous,
  status: 'active',
  progress: 50,
  startedAt: '2024-01-01T12:07:00Z',
  updatedAt: '2024-01-01T12:07:00Z'
}

// After completion
{
  ...previous,
  status: 'completed',
  progress: 100,
  result: {
    videoUrl: 'https://r2.example.com/videos/gen_123.mp4',
    thumbnailUrl: 'https://r2.example.com/thumbnails/gen_123.jpg',
    duration: 10,
    fileSize: 5242880
  },
  completedAt: '2024-01-01T12:08:00Z',
  updatedAt: '2024-01-01T12:08:00Z'
}
```

### 2. QueueManager Durable Object State

```typescript
// Queue state
{
  queue: [
    {
      jobId: 'job_123...',
      priority: 0,
      createdAt: '2024-01-01T12:00:00Z',
      status: 'queued'
    }
  ],
  activeJobs: [
    {
      jobId: 'job_123...',
      workerId: 'worker_123...',
      startedAt: '2024-01-01T12:07:00Z'
    }
  ],
  workers: [
    {
      workerId: 'worker_123...',
      lastHeartbeat: '2024-01-01T12:07:30Z',
      status: 'active',
      currentJobId: 'job_123...'
    }
  ]
}
```

---

## Comprehensive Logging Strategy

### 1. Next.js API Routes - Logging Points

#### `/api/generations` (POST)

```typescript
// Log 1: Request received
console.log("[GENERATION_CREATE] Request received", {
  userId: session.user.id,
  conversationId: body.conversationId,
  messageId: body.messageId,
  prompt: body.prompt,
  provider: body.provider,
  timestamp: new Date().toISOString(),
});

// Log 2: Generation created in DB
console.log("[GENERATION_CREATE] Generation created in DB", {
  generationId: generation.id,
  status: generation.status,
  timestamp: new Date().toISOString(),
});

// Log 3: Worker API call
console.log("[GENERATION_CREATE] Calling Worker API", {
  generationId: generation.id,
  workerUrl: workerClient.config.baseUrl,
  timestamp: new Date().toISOString(),
});

// Log 4: Worker response
console.log("[GENERATION_CREATE] Worker response", {
  generationId: generation.id,
  success: workerResponse.success,
  workerGenerationId: workerResponse.data?.generationId,
  error: workerResponse.error,
  timestamp: new Date().toISOString(),
});

// Log 5: Final response
console.log("[GENERATION_CREATE] Returning response", {
  generationId: generation.id,
  status: generation.status,
  timestamp: new Date().toISOString(),
});
```

#### `/api/generations/[id]/status` (GET)

```typescript
// Log 1: Status check request
console.log("[GENERATION_STATUS] Request received", {
  generationId: params.id,
  userId: session.user.id,
  timestamp: new Date().toISOString(),
});

// Log 2: Worker status check
console.log("[GENERATION_STATUS] Checking Worker status", {
  generationId: params.id,
  workerGenerationId,
  timestamp: new Date().toISOString(),
});

// Log 3: Worker response
console.log("[GENERATION_STATUS] Worker response", {
  generationId: params.id,
  success: workerResponse.success,
  status: workerResponse.data?.status,
  progress: workerResponse.data?.progress,
  timestamp: new Date().toISOString(),
});

// Log 4: Returning response
console.log("[GENERATION_STATUS] Returning response", {
  generationId: params.id,
  dbStatus: generation.status,
  workerStatus: workerResponse.data?.status,
  timestamp: new Date().toISOString(),
});
```

#### `/api/webhooks/worker` (POST) - NEW ENDPOINT NEEDED

```typescript
// Log 1: Webhook received
console.log("[WEBHOOK] Worker webhook received", {
  event: body.event,
  jobId: body.jobId,
  generationId: body.generationId,
  timestamp: new Date().toISOString(),
});

// Log 2: Updating generation
console.log("[WEBHOOK] Updating generation in DB", {
  generationId: body.generationId,
  status: body.status,
  timestamp: new Date().toISOString(),
});

// Log 3: Creating assistant message
console.log("[WEBHOOK] Creating assistant message", {
  generationId: body.generationId,
  conversationId: generation.conversationId,
  messageType: body.status === "completed" ? "generation_result" : "error",
  timestamp: new Date().toISOString(),
});

// Log 4: Webhook processed
console.log("[WEBHOOK] Webhook processed successfully", {
  generationId: body.generationId,
  timestamp: new Date().toISOString(),
});
```

### 2. Cloudflare Worker - Logging Points

#### Worker Entry Point (`worker.ts`)

```typescript
// Log 1: Request received
console.log("[WORKER] Request received", {
  method: request.method,
  path: url.pathname,
  requestId,
  timestamp: new Date().toISOString(),
});

// Log 2: Authentication
console.log("[WORKER] Authentication", {
  requestId,
  authenticated: authResult.success,
  userId: authResult.userId,
  timestamp: new Date().toISOString(),
});

// Log 3: Route handling
console.log("[WORKER] Route handling", {
  requestId,
  route: path,
  timestamp: new Date().toISOString(),
});

// Log 4: Response
console.log("[WORKER] Response", {
  requestId,
  status: response.status,
  timestamp: new Date().toISOString(),
});
```

#### Generation Routes (`worker.ts`)

```typescript
// POST /api/generations
console.log("[WORKER_GENERATION_CREATE] Request received", {
  userId,
  prompt: body.prompt,
  provider: body.provider,
  timestamp: new Date().toISOString(),
});

console.log("[WORKER_GENERATION_CREATE] Creating job", {
  generationId: generationData.id,
  timestamp: new Date().toISOString(),
});

console.log("[WORKER_GENERATION_CREATE] Job created", {
  generationId: generationData.id,
  jobId: result.jobId,
  queuePosition: result.queuePosition,
  timestamp: new Date().toISOString(),
});

console.log("[WORKER_GENERATION_CREATE] Returning response", {
  generationId: generationData.id,
  status: 201,
  timestamp: new Date().toISOString(),
});
```

#### JobManager Durable Object

```typescript
// createJob
console.log("[JOB_MANAGER] Creating job", {
  jobId: jobData.id,
  generationId: jobData.generationId,
  userId: jobData.userId,
  timestamp: new Date().toISOString(),
});

console.log("[JOB_MANAGER] Job created", {
  jobId: jobData.id,
  status: jobState.status,
  timestamp: new Date().toISOString(),
});

// updateJobStatus
console.log("[JOB_MANAGER] Updating job status", {
  jobId,
  oldStatus: jobState.status,
  newStatus: status,
  timestamp: new Date().toISOString(),
});

console.log("[JOB_MANAGER] Job status updated", {
  jobId,
  status,
  timestamp: new Date().toISOString(),
});

// completeJob
console.log("[JOB_MANAGER] Completing job", {
  jobId,
  result: result,
  timestamp: new Date().toISOString(),
});

console.log("[JOB_MANAGER] Job completed", {
  jobId,
  status: "completed",
  timestamp: new Date().toISOString(),
});

// failJob
console.log("[JOB_MANAGER] Failing job", {
  jobId,
  error,
  timestamp: new Date().toISOString(),
});

console.log("[JOB_MANAGER] Job failed", {
  jobId,
  status: "failed",
  error,
  timestamp: new Date().toISOString(),
});
```

#### GenerationWorkflow Service

```typescript
// startGeneration
console.log("[GENERATION_WORKFLOW] Starting generation", {
  jobId,
  generationId,
  prompt,
  provider,
  timestamp: new Date().toISOString(),
});

console.log("[GENERATION_WORKFLOW] Calling Veo3 API", {
  jobId,
  prompt,
  timestamp: new Date().toISOString(),
});

console.log("[GENERATION_WORKFLOW] Veo3 API response", {
  jobId,
  videoId: veo3Response.videoId,
  status: veo3Response.status,
  timestamp: new Date().toISOString(),
});

console.log("[GENERATION_WORKFLOW] Uploading to R2", {
  jobId,
  videoId,
  timestamp: new Date().toISOString(),
});

console.log("[GENERATION_WORKFLOW] Upload complete", {
  jobId,
  videoUrl,
  timestamp: new Date().toISOString(),
});

console.log("[GENERATION_WORKFLOW] Sending webhook", {
  jobId,
  generationId,
  status: "completed",
  timestamp: new Date().toISOString(),
});

console.log("[GENERATION_WORKFLOW] Generation complete", {
  jobId,
  status: "completed",
  timestamp: new Date().toISOString(),
});
```

---

## Implementation Checklist

### Phase 1: Add Comprehensive Logging

- [ ] Add logging to all Next.js API routes
- [ ] Add logging to all Worker endpoints
- [ ] Add logging to JobManager Durable Object
- [ ] Add logging to QueueManager Durable Object
- [ ] Add logging to GenerationWorkflow service
- [ ] Add logging to Veo3Service
- [ ] Create centralized logging utility

### Phase 2: Create Webhook Endpoint

- [ ] Create `/api/webhooks/worker` endpoint in Next.js
- [ ] Implement webhook signature verification
- [ ] Handle all webhook event types:
  - [ ] `generation.started`
  - [ ] `generation.progress`
  - [ ] `generation.completed`
  - [ ] `generation.failed`
- [ ] Update generation status in DB
- [ ] Create assistant message with result
- [ ] Add logging to webhook handler

### Phase 3: Implement Webhook in Worker

- [ ] Add webhook URL to Worker config
- [ ] Send webhook on job status changes
- [ ] Implement retry logic for webhook failures
- [ ] Add logging for webhook calls

### Phase 4: Implement Frontend Polling/Push

- [ ] Add polling mechanism in frontend
- [ ] Poll `/api/generations/[id]/status` every 5 seconds
- [ ] Stop polling when status is terminal (completed/failed)
- [ ] Display status updates to user
- [ ] Show video player when completed

### Phase 5: Testing

- [ ] Test complete flow from request to completion
- [ ] Test error scenarios
- [ ] Test webhook failures
- [ ] Test network issues
- [ ] Verify all logs are being generated

---

## Debugging Steps

### Step 1: Enable All Logging

1. Add all logging statements from above
2. Start Next.js dev server with logging
3. Start Worker with logging
4. Monitor console output

### Step 2: Test Generation Creation

1. Send a message requesting video generation
2. Check logs for:
   - [ ] Message created in DB
   - [ ] Generation created in DB
   - [ ] Worker API called
   - [ ] Worker response received
3. Verify generation exists in DB with correct status

### Step 3: Test Worker Processing

1. Check Worker logs for:
   - [ ] Job created in JobManager
   - [ ] Job added to queue
   - [ ] Job started processing
   - [ ] Veo3 API called
   - [ ] Video generated
   - [ ] Video uploaded to R2
   - [ ] Webhook sent

### Step 4: Test Webhook Reception

1. Check Next.js logs for:
   - [ ] Webhook received
   - [ ] Generation updated in DB
   - [ ] Assistant message created
2. Verify generation status in DB is "completed"
3. Verify assistant message exists in conversation

### Step 5: Test Frontend Updates

1. Check frontend logs for:
   - [ ] Polling started
   - [ ] Status updates received
   - [ ] Video player displayed
2. Verify user sees the video

---

## Common Issues & Solutions

### Issue 1: Generation created but no response

**Symptoms**: Generation exists in DB, but user doesn't see any response

**Possible Causes**:

1. Worker API call failed silently
2. Worker didn't send webhook
3. Webhook endpoint doesn't exist
4. Frontend not polling for status

**Solution**:

1. Check Worker logs for API call
2. Implement webhook endpoint
3. Implement frontend polling
4. Add error handling

### Issue 2: Worker completes but DB not updated

**Symptoms**: Worker logs show completion, but DB status is still "processing"

**Possible Causes**:

1. Webhook not sent
2. Webhook sent but failed
3. Webhook received but update failed

**Solution**:

1. Check Worker logs for webhook call
2. Check Next.js logs for webhook reception
3. Add webhook retry logic
4. Add error handling in webhook handler

### Issue 3: Frontend not showing updates

**Symptoms**: DB updated, but frontend still shows old status

**Possible Causes**:

1. Frontend not polling
2. Polling interval too long
3. Cache issues
4. WebSocket not connected

**Solution**:

1. Implement polling
2. Reduce polling interval
3. Clear cache
4. Add WebSocket support

---

## Next Steps

1. **Immediate**: Add comprehensive logging to all components
2. **Short-term**: Implement webhook endpoint and worker webhook calls
3. **Medium-term**: Implement frontend polling and status updates
4. **Long-term**: Add WebSocket support for real-time updates

---

## Files to Modify

### Next.js Files

- `apps/web/src/app/api/generations/route.ts` - Add logging
- `apps/web/src/app/api/generations/[id]/status/route.ts` - Add logging
- `apps/web/src/app/api/webhooks/worker/route.ts` - **CREATE NEW FILE**
- `apps/web/src/app/api/conversations/[id]/messages/route.ts` - Add logging
- `apps/web/src/lib/cloudflare/worker-client.ts` - Add logging

### Worker Files

- `workers/src/worker.ts` - Add logging
- `workers/src/durable-objects/JobManager.ts` - Add logging
- `workers/src/durable-objects/QueueManager.ts` - Add logging
- `workers/src/services/GenerationWorkflow.ts` - Add logging and webhook calls
- `workers/src/services/Veo3Service.ts` - Add logging

### Frontend Files

- `apps/web/src/components/chat/` - Add polling logic
- `apps/web/src/hooks/useGenerationStatus.ts` - **CREATE NEW FILE**

---

## Logging Format

All logs should follow this format:

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

This makes it easy to:

1. Filter logs by component
2. Track specific requests
3. Debug issues
4. Monitor performance

---

## Success Criteria

The flow is working correctly when:

1. ✅ User sends message requesting video
2. ✅ Generation created in DB with status "pending_clarification"
3. ✅ User sees clarification questions (if needed)
4. ✅ User confirms generation
5. ✅ Worker processes video
6. ✅ Worker sends webhook to Next.js
7. ✅ Next.js updates DB and creates assistant message
8. ✅ Frontend polls and shows completed video
9. ✅ All steps are logged with timestamps

---

## Monitoring

Set up monitoring for:

- Generation creation rate
- Worker processing time
- Webhook success rate
- Frontend polling frequency
- Error rates by component

Use these metrics to:

- Identify bottlenecks
- Debug issues
- Optimize performance
- Alert on failures
