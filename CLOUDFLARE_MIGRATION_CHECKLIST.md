# Cloudflare Workers + R2 Migration Checklist

## Overview

This checklist outlines the complete migration from BullMQ + Redis to Cloudflare Workers + R2, maintaining all existing functionality while improving performance, reducing costs, and eliminating infrastructure management.

## Current State Analysis

✅ **Completed (Phases 1-4):**

- Database schema and Drizzle queries
- API routes with BullMQ integration
- Zustand state management
- React Query integration

🔄 **Migration Required:**

- BullMQ → Cloudflare Workers + Durable Objects
- Redis → Durable Objects storage
- File storage → R2
- Worker processes → Cloudflare Workers

---

## Phase 5: Project Structure & Setup

### 5.1 Create Cloudflare Workers Project

#### 5.1.1 Initialize Workers Project

```bash
# In project root
mkdir workers
cd workers
npm init -y
```

#### 5.1.2 Install Dependencies

```bash
# Core dependencies
npm install @cloudflare/workers-types wrangler

# Development dependencies
npm install -D typescript @types/node

# Optional: Shared types package
npm install -D @typescript-eslint/parser @typescript-eslint/eslint-plugin
```

#### 5.1.3 Project Structure Setup

```
nimu-app/
├── apps/web/                    # Existing Next.js app
├── workers/                     # NEW: Cloudflare Workers
│   ├── src/
│   │   ├── worker.ts           # Main worker entry point
│   │   ├── durable-objects/
│   │   │   ├── JobManager.ts   # Job state management
│   │   │   ├── QueueManager.ts # Queue coordination
│   │   │   └── index.ts        # Durable Object exports
│   │   ├── r2/
│   │   │   ├── VideoStorage.ts # R2 operations
│   │   │   └── index.ts        # R2 exports
│   │   ├── services/
│   │   │   ├── Veo3Service.ts  # Veo3 API integration
│   │   │   └── index.ts        # Service exports
│   │   ├── types/
│   │   │   ├── generation.ts   # Generation types
│   │   │   ├── job.ts          # Job types
│   │   │   └── index.ts        # Type exports
│   │   └── utils/
│   │       ├── auth.ts         # Authentication helpers
│   │       ├── validation.ts   # Input validation
│   │       └── index.ts        # Utility exports
│   ├── wrangler.toml           # Cloudflare configuration
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
└── packages/                   # Shared code (optional)
    └── shared/
        ├── types/              # Shared TypeScript types
        ├── utils/              # Shared utilities
        └── package.json
```

### 5.2 Cloudflare Configuration

#### 5.2.1 Create `workers/wrangler.toml`

- [x] Configure worker name and compatibility date
- [x] Set up Durable Objects bindings
- [x] Configure R2 bucket bindings
- [x] Set environment variables
- [x] Configure cron triggers for cleanup
- [x] Set up custom domain (optional)

#### 5.2.2 Environment Variables Setup

- [x] Create `.dev.vars` for development
- [x] Configure production secrets (Cloudflare secrets setup instructions)
- [x] Set up R2 credentials (Create bucket, access keys instructions)
- [x] Configure Veo3 API key (Get API key from Veo3 instructions)
- [x] Set database connection string (Connect to existing PostgreSQL instructions)

### 5.3 TypeScript Configuration

#### 5.3.1 Create `workers/tsconfig.json`

- [x] Configure TypeScript for Workers
- [x] Set up path aliases
- [x] Configure strict mode
- [x] Set target and module resolution

#### 5.3.2 Create Shared Types Package (Optional)

- [x] Extract common types from Next.js app
- [x] Create shared type definitions
- [ ] Set up package linking
- [ ] Configure type exports

---

## Phase 6: Durable Objects Implementation

### 6.1 Job Manager Durable Object

#### 6.1.1 Create `workers/src/durable-objects/JobManager.ts`

- [ ] Implement Durable Object class
- [ ] Create job state management
- [ ] Add job creation method
- [ ] Add job status updates
- [ ] Add progress tracking
- [ ] Add retry logic
- [ ] Add job completion handling
- [ ] Add error handling
- [ ] Add job cleanup
- [ ] Add job statistics

#### 6.1.2 Job State Management

- [ ] Define job state interface
- [ ] Implement state persistence
- [ ] Add state validation
- [ ] Add state transitions
- [ ] Add state history tracking

#### 6.1.3 Job Operations

- [ ] `createJob(generationData)` - Create new generation job
- [ ] `updateJobStatus(jobId, status)` - Update job status
- [ ] `updateProgress(jobId, progress)` - Update job progress
- [ ] `completeJob(jobId, result)` - Mark job as completed
- [ ] `failJob(jobId, error)` - Mark job as failed
- [ ] `retryJob(jobId)` - Retry failed job
- [ ] `cancelJob(jobId)` - Cancel active job
- [ ] `getJobStatus(jobId)` - Get job status
- [ ] `getJobHistory(jobId)` - Get job history
- [ ] `cleanupOldJobs()` - Clean up completed jobs

### 6.2 Queue Manager Durable Object

#### 6.2.1 Create `workers/src/durable-objects/QueueManager.ts`

- [ ] Implement queue state management
- [ ] Add job prioritization
- [ ] Add worker coordination
- [ ] Add queue statistics
- [ ] Add queue monitoring

#### 6.2.2 Queue Operations

- [ ] `addToQueue(jobData)` - Add job to queue
- [ ] `getNextJob()` - Get next job to process
- [ ] `updateQueuePosition(jobId)` - Update job position
- [ ] `getQueueStats()` - Get queue statistics
- [ ] `pauseQueue()` - Pause queue processing
- [ ] `resumeQueue()` - Resume queue processing
- [ ] `clearQueue()` - Clear all jobs
- [ ] `getQueueStatus()` - Get queue status

### 6.3 Durable Object Bindings

#### 6.3.1 Configure Durable Object Classes

- [ ] Register JobManager class
- [ ] Register QueueManager class
- [ ] Set up class bindings
- [ ] Configure migrations
- [ ] Set up development bindings

#### 6.3.2 Durable Object Utilities

- [ ] Create helper functions for Durable Object access
- [ ] Add error handling for Durable Object operations
- [ ] Add retry logic for Durable Object calls
- [ ] Add logging for Durable Object operations

---

## Phase 7: R2 Storage Implementation

### 7.1 R2 Configuration

#### 7.1.1 Create R2 Bucket

- [ ] Create R2 bucket via Wrangler CLI
- [ ] Configure bucket permissions
- [ ] Set up CORS policies
- [ ] Configure bucket lifecycle rules
- [ ] Set up bucket notifications (optional)

#### 7.1.2 R2 Bindings Setup

- [ ] Configure R2 bucket binding in wrangler.toml
- [ ] Set up environment variables
- [ ] Configure access keys
- [ ] Set up custom domain (optional)

### 7.2 Video Storage Implementation

#### 7.2.1 Create `workers/src/r2/VideoStorage.ts`

- [ ] Implement R2 client operations
- [ ] Add video upload functionality
- [ ] Add video download functionality
- [ ] Add video deletion functionality
- [ ] Add signed URL generation
- [ ] Add file validation
- [ ] Add error handling

#### 7.2.2 Video Operations

- [ ] `uploadVideo(file, generationId)` - Upload video to R2
- [ ] `downloadVideo(generationId)` - Download video from R2
- [ ] `deleteVideo(generationId)` - Delete video from R2
- [ ] `getVideoUrl(generationId)` - Get public video URL
- [ ] `generateSignedUrl(generationId, expiration)` - Generate signed URL
- [ ] `validateVideo(file)` - Validate video file
- [ ] `getVideoMetadata(generationId)` - Get video metadata
- [ ] `listVideos(prefix)` - List videos with prefix
- [ ] `cleanupOldVideos()` - Clean up old videos

#### 7.2.3 File Processing

- [ ] Add video format validation
- [ ] Add file size limits
- [ ] Add thumbnail generation
- [ ] Add video compression
- [ ] Add metadata extraction
- [ ] Add virus scanning (optional)

### 7.3 R2 Integration with Workers

#### 7.3.1 Worker R2 Operations

- [ ] Integrate R2 with job processing
- [ ] Add video upload to generation workflow
- [ ] Add error handling for R2 operations
- [ ] Add retry logic for failed uploads
- [ ] Add progress tracking for uploads

#### 7.3.2 R2 Utilities

- [ ] Create helper functions for R2 operations
- [ ] Add file type detection
- [ ] Add file size formatting
- [ ] Add URL validation
- [ ] Add cleanup utilities

---

## Phase 8: Worker Implementation

### 8.1 Main Worker Entry Point

#### 8.1.1 Create `workers/src/worker.ts`

- [ ] Implement main worker class
- [ ] Add route handling
- [ ] Add authentication middleware
- [ ] Add error handling
- [ ] Add logging
- [ ] Add CORS handling

#### 8.1.2 Route Configuration

- [ ] `POST /api/generations` - Create generation request
- [ ] `GET /api/generations/:id` - Get generation status
- [ ] `POST /api/generations/:id/clarify` - Submit clarification
- [ ] `POST /api/generations/:id/confirm` - Confirm generation
- [ ] `PUT /api/generations/:id/status` - Update generation status
- [ ] `GET /api/queue/jobs/:id` - Get job status
- [ ] `POST /api/queue/workers` - Worker management
- [ ] `GET /api/storage/videos/:id` - Get video URL
- [ ] `DELETE /api/storage/videos/:id` - Delete video

### 8.2 Authentication & Security

#### 8.2.1 Authentication Middleware

- [ ] Implement JWT token validation
- [ ] Add user authentication
- [ ] Add rate limiting
- [ ] Add request validation
- [ ] Add error responses

#### 8.2.2 Security Measures

- [ ] Add input sanitization
- [ ] Add request size limits
- [ ] Add timeout handling
- [ ] Add CORS configuration
- [ ] Add security headers

### 8.3 Error Handling & Logging

#### 8.3.1 Error Handling

- [ ] Implement consistent error responses
- [ ] Add error logging
- [ ] Add error monitoring
- [ ] Add retry mechanisms
- [ ] Add fallback responses

#### 8.3.2 Logging System

- [ ] Add structured logging
- [ ] Add log levels
- [ ] Add request tracking
- [ ] Add performance metrics
- [ ] Add error tracking

---

## Phase 9: Veo3 Service Integration

### 9.1 Veo3 Service Implementation

#### 9.1.1 Create `workers/src/services/Veo3Service.ts`

- [ ] Implement Veo3 API client
- [ ] Add video generation request
- [ ] Add operation polling
- [ ] Add result retrieval
- [ ] Add error handling
- [ ] Add retry logic

#### 9.1.2 Veo3 Operations

- [ ] `generateVideo(prompt, options)` - Start video generation
- [ ] `pollOperation(operationId)` - Poll generation status
- [ ] `getResult(operationId)` - Get generation result
- [ ] `cancelOperation(operationId)` - Cancel generation
- [ ] `validatePrompt(prompt)` - Validate generation prompt
- [ ] `estimateCost(prompt, options)` - Estimate generation cost

### 9.2 Generation Workflow

#### 9.2.1 Generation Process

- [ ] Implement clarification handling
- [ ] Add confirmation workflow
- [ ] Add queue management
- [ ] Add progress tracking
- [ ] Add completion handling

#### 9.2.2 Integration with Durable Objects

- [ ] Connect Veo3 service with JobManager
- [ ] Add status updates to Durable Objects
- [ ] Add progress tracking
- [ ] Add error handling
- [ ] Add retry logic

---

## Phase 10: Next.js API Migration

### 10.1 Update API Routes

#### 10.1.1 Update `apps/web/src/app/api/generations/route.ts`

- [ ] Remove BullMQ queue.add() calls
- [ ] Replace with Cloudflare Worker API calls
- [ ] Update error handling
- [ ] Maintain same response format
- [ ] Add request validation
- [ ] Add authentication

#### 10.1.2 Update `apps/web/src/app/api/generations/[id]/confirm/route.ts`

- [ ] Replace BullMQ job creation with Worker API
- [ ] Update job ID handling
- [ ] Maintain status flow
- [ ] Add error handling
- [ ] Add validation

#### 10.1.3 Update `apps/web/src/app/api/queue/jobs/[id]/route.ts`

- [ ] Replace BullMQ job status with Worker API
- [ ] Update progress tracking
- [ ] Maintain polling compatibility
- [ ] Add error handling
- [ ] Add caching

### 10.2 Remove BullMQ Dependencies

#### 10.2.1 Remove Files

- [ ] Delete `apps/web/src/lib/redis.ts`
- [ ] Delete `apps/web/src/lib/queues/generationQueue.ts`
- [ ] Delete `apps/web/src/lib/queues/queueWorker.ts`
- [ ] Delete `apps/web/src/lib/queues/index.ts`
- [ ] Delete `apps/web/src/lib/queues/` directory

#### 10.2.2 Update Package.json

- [ ] Remove `bullmq` dependency
- [ ] Remove `ioredis` dependency
- [ ] Remove Redis-related scripts
- [ ] Update build scripts

#### 10.2.3 Environment Variables

- [ ] Remove Redis environment variables
- [ ] Add Cloudflare Worker URL
- [ ] Add R2 configuration
- [ ] Update documentation

### 10.3 Create Worker Client

#### 10.3.1 Create `apps/web/src/lib/cloudflare/worker-client.ts`

- [ ] Implement HTTP client for Workers
- [ ] Add authentication headers
- [ ] Add error handling
- [ ] Add retry logic
- [ ] Add request/response logging

#### 10.3.2 Worker API Functions

- [ ] `createGeneration(data)` - Create generation request
- [ ] `getGenerationStatus(id)` - Get generation status
- [ ] `submitClarification(id, clarification)` - Submit clarification
- [ ] `confirmGeneration(id)` - Confirm generation
- [ ] `getJobStatus(jobId)` - Get job status
- [ ] `getVideoUrl(generationId)` - Get video URL

---

## Phase 11: React Query Updates

### 11.1 Update Query Hooks

#### 11.1.1 Update `apps/web/src/hooks/queries/useGenerations.ts`

- [ ] Update API endpoints to use Workers
- [ ] Remove BullMQ job status polling
- [ ] Add Worker job status polling
- [ ] Update error handling
- [ ] Maintain same interface
- [ ] Add retry logic

#### 11.1.2 Update `apps/web/src/hooks/queries/useJobs.ts`

- [ ] Replace BullMQ job status with Worker API
- [ ] Update polling intervals
- [ ] Maintain same interface
- [ ] Add error handling
- [ ] Add caching

#### 11.1.3 Create `apps/web/src/hooks/queries/useR2.ts`

- [ ] Add video upload hook
- [ ] Add video download hook
- [ ] Add signed URL generation
- [ ] Add video metadata
- [ ] Add error handling

### 11.2 Update Store Integration

#### 11.2.1 Update `apps/web/src/stores/useGenerationStore.ts`

- [ ] Update job status handling
- [ ] Remove BullMQ-specific logic
- [ ] Add Worker-specific status updates
- [ ] Maintain same store interface
- [ ] Add R2 integration

#### 11.2.2 Update Store Actions

- [ ] Update `requestGeneration` action
- [ ] Update `confirmGeneration` action
- [ ] Update `pollGeneration` action
- [ ] Add video handling actions
- [ ] Update error handling

---

## Phase 12: Component Updates

### 12.1 Update Generation Components

#### 12.1.1 Update `GenerationStatus.tsx`

- [ ] Update to use Worker API
- [ ] Maintain same UI/UX
- [ ] Update progress tracking
- [ ] Handle new error states
- [ ] Add R2 video display

#### 12.1.2 Update `QueueStatus.tsx`

- [ ] Replace BullMQ queue status with Worker API
- [ ] Update queue position display
- [ ] Maintain real-time updates
- [ ] Add Worker-specific status
- [ ] Update error handling

#### 12.1.3 Update `ConfirmationModal.tsx`

- [ ] Update to use Worker API
- [ ] Maintain same workflow
- [ ] Add R2 preview
- [ ] Update error handling
- [ ] Add progress indicators

### 12.2 Update Video Components

#### 12.2.1 Update `VideoPlayer.tsx`

- [ ] Update to use R2 URLs
- [ ] Add signed URL generation
- [ ] Update video metadata
- [ ] Handle R2-specific errors
- [ ] Add download functionality

#### 12.2.2 Create `R2VideoPlayer.tsx`

- [ ] Implement R2-specific video player
- [ ] Add loading states
- [ ] Add error handling
- [ ] Add metadata display
- [ ] Add sharing functionality

### 12.3 Update UI Components

#### 12.3.1 Update Dashboard Components

- [ ] Update to use new API endpoints
- [ ] Maintain same functionality
- [ ] Add loading states
- [ ] Update error handling
- [ ] Add R2 integration

#### 12.3.2 Update Chat Components

- [ ] Update message handling
- [ ] Add video message support
- [ ] Update generation flow
- [ ] Add R2 video display
- [ ] Update error handling

---

## Phase 13: Testing & Validation

### 13.1 Unit Testing

#### 13.1.1 Worker Testing

- [ ] Test Durable Object operations
- [ ] Test R2 operations
- [ ] Test Veo3 service integration
- [ ] Test error handling
- [ ] Test authentication

#### 13.1.2 Next.js Testing

- [ ] Test updated API routes
- [ ] Test React Query hooks
- [ ] Test Zustand stores
- [ ] Test component updates
- [ ] Test error scenarios

### 13.2 Integration Testing

#### 13.2.1 End-to-End Testing

- [ ] Test complete generation workflow
- [ ] Test video upload/download
- [ ] Test queue management
- [ ] Test error recovery
- [ ] Test performance

#### 13.2.2 Migration Testing

- [ ] Test parallel system operation
- [ ] Test data migration
- [ ] Test rollback procedures
- [ ] Test performance comparison
- [ ] Test cost analysis

### 13.3 Performance Testing

#### 13.3.1 Load Testing

- [ ] Test concurrent generations
- [ ] Test queue performance
- [ ] Test R2 upload/download speeds
- [ ] Test Worker response times
- [ ] Test Durable Object performance

#### 13.3.2 Stress Testing

- [ ] Test high load scenarios
- [ ] Test error recovery
- [ ] Test resource limits
- [ ] Test timeout handling
- [ ] Test failover scenarios

---

## Phase 14: Deployment & Migration

### 14.1 Cloudflare Setup

#### 14.1.1 Account Setup

- [ ] Create Cloudflare account
- [ ] Set up billing
- [ ] Configure domains
- [ ] Set up monitoring
- [ ] Configure alerts

#### 14.1.2 R2 Setup

- [ ] Create R2 bucket
- [ ] Configure permissions
- [ ] Set up CORS
- [ ] Configure lifecycle rules
- [ ] Test bucket access

#### 14.1.3 Workers Setup

- [ ] Deploy Workers
- [ ] Configure Durable Objects
- [ ] Set up custom domain
- [ ] Configure monitoring
- [ ] Test deployment

### 14.2 Migration Strategy

#### 14.2.1 Parallel Operation

- [ ] Deploy Workers alongside BullMQ
- [ ] Test both systems
- [ ] Compare performance
- [ ] Validate functionality
- [ ] Prepare rollback plan

#### 14.2.2 Gradual Migration

- [ ] Migrate new generations to Workers
- [ ] Monitor system performance
- [ ] Migrate existing generations
- [ ] Update monitoring
- [ ] Complete migration

#### 14.2.3 Cleanup

- [ ] Remove BullMQ dependencies
- [ ] Clean up Redis data
- [ ] Update documentation
- [ ] Update monitoring
- [ ] Archive old systems

### 14.3 Production Deployment

#### 14.3.1 Pre-deployment

- [ ] Final testing
- [ ] Performance validation
- [ ] Security review
- [ ] Backup procedures
- [ ] Rollback plan

#### 14.3.2 Deployment

- [ ] Deploy to staging
- [ ] Test staging environment
- [ ] Deploy to production
- [ ] Monitor deployment
- [ ] Validate functionality

#### 14.3.3 Post-deployment

- [ ] Monitor performance
- [ ] Monitor costs
- [ ] Monitor errors
- [ ] Update documentation
- [ ] Team training

---

## Phase 15: Monitoring & Optimization

### 15.1 Monitoring Setup

#### 15.1.1 Cloudflare Analytics

- [ ] Set up Worker analytics
- [ ] Set up R2 analytics
- [ ] Configure alerts
- [ ] Set up dashboards
- [ ] Monitor performance

#### 15.1.2 Application Monitoring

- [ ] Set up error tracking
- [ ] Set up performance monitoring
- [ ] Set up user analytics
- [ ] Set up cost monitoring
- [ ] Set up health checks

### 15.2 Optimization

#### 15.2.1 Performance Optimization

- [ ] Optimize Worker code
- [ ] Optimize R2 operations
- [ ] Optimize Durable Objects
- [ ] Optimize caching
- [ ] Optimize polling

#### 15.2.2 Cost Optimization

- [ ] Monitor R2 usage
- [ ] Optimize storage classes
- [ ] Optimize Worker execution
- [ ] Optimize Durable Object usage
- [ ] Set up cost alerts

### 15.3 Maintenance

#### 15.3.1 Regular Maintenance

- [ ] Update dependencies
- [ ] Monitor security
- [ ] Clean up old data
- [ ] Optimize performance
- [ ] Update documentation

#### 15.3.2 Troubleshooting

- [ ] Create troubleshooting guides
- [ ] Set up debugging tools
- [ ] Create runbooks
- [ ] Train support team
- [ ] Set up escalation procedures

---

## Success Criteria

### Functional Requirements

- [ ] All existing functionality works with Workers
- [ ] Video generation workflow is complete
- [ ] Real-time status updates work
- [ ] File storage and retrieval work
- [ ] Error handling is comprehensive
- [ ] Authentication and authorization work

### Performance Requirements

- [ ] Response times are equal or better
- [ ] Throughput is equal or better
- [ ] Error rates are lower
- [ ] Availability is higher
- [ ] Scalability is improved

### Cost Requirements

- [ ] Total costs are reduced
- [ ] Infrastructure costs are eliminated
- [ ] Operational costs are reduced
- [ ] Maintenance costs are lower
- [ ] Scaling costs are predictable

### Operational Requirements

- [ ] No infrastructure management
- [ ] Automated scaling
- [ ] Built-in monitoring
- [ ] Easy deployment
- [ ] Simple maintenance

---

## Risk Mitigation

### Technical Risks

- **Risk**: Worker timeout limits
- **Mitigation**: Optimize code, use Durable Objects for long operations

- **Risk**: Durable Object limits
- **Mitigation**: Monitor usage, optimize state management

- **Risk**: R2 performance
- **Mitigation**: Test thoroughly, optimize operations

### Operational Risks

- **Risk**: Migration complexity
- **Mitigation**: Parallel operation, gradual migration

- **Risk**: Data loss
- **Mitigation**: Comprehensive backups, rollback plan

- **Risk**: Performance regression
- **Mitigation**: Benchmarking, performance testing

### Business Risks

- **Risk**: Increased costs
- **Mitigation**: Cost monitoring, optimization

- **Risk**: Service disruption
- **Mitigation**: Gradual migration, rollback plan

- **Risk**: User experience impact
- **Mitigation**: Maintain same interfaces, thorough testing

---

## Timeline

### Week 1-2: Setup & Core Implementation

- Project structure setup
- Durable Objects implementation
- R2 integration
- Basic Worker implementation

### Week 3-4: Integration & Testing

- Next.js API migration
- React Query updates
- Component updates
- Comprehensive testing

### Week 5-6: Deployment & Migration

- Cloudflare setup
- Production deployment
- Migration execution
- Monitoring setup

### Week 7-8: Optimization & Maintenance

- Performance optimization
- Cost optimization
- Documentation updates
- Team training

---

## Implementation Priority

### High Priority (Week 1-2)

1. Project structure and setup
2. Durable Objects implementation
3. R2 integration
4. Basic Worker functionality

### Medium Priority (Week 3-4)

1. Next.js API migration
2. React Query updates
3. Component updates
4. Testing and validation

### Low Priority (Week 5+)

1. Advanced features
2. Performance optimization
3. Monitoring and analytics
4. Documentation and training

---

## Notes

- **Cloudflare Workers**: Replace BullMQ with serverless Workers for better scalability
- **Durable Objects**: Provide stateful storage for job management without Redis
- **R2 Storage**: Cost-effective video storage with global CDN
- **Migration Strategy**: Parallel operation to minimize risk
- **Performance**: Workers provide better global performance than traditional servers
- **Cost**: Significant cost reduction by eliminating Redis and server infrastructure
- **Monitoring**: Built-in Cloudflare analytics and monitoring
- **Security**: Enhanced security with Cloudflare's edge network
- **Scaling**: Automatic scaling without infrastructure management

This checklist provides a comprehensive roadmap for migrating from BullMQ + Redis to Cloudflare Workers + R2 while maintaining all existing functionality and improving performance and cost efficiency.
