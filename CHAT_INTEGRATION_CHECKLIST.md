# Chat Integration with Veo3 - Implementation Checklist

## Overview

This checklist outlines the complete process to integrate real chat functionality with Veo3 video generation, replacing mock data with actual database operations, API integrations, and state management using Zustand and React Query.

## Current State Analysis

✅ **Completed:**

- Better Auth authentication system
- Comprehensive database schema (conversations, messages, generations, usage tracking)
- Complete dashboard UI with chat interface
- Mock data structure and components
- Database connection setup (Neon PostgreSQL + Drizzle ORM)

🔄 **Needs Implementation:**

- Real API endpoints for CRUD operations
- Veo3 integration for video generation
- Zustand state management
- React Query data fetching
- Real-time updates and polling

---

## Phase 1: Database & API Foundation

### 1.1 Install Required Dependencies

```bash
pnpm add @google/genai zustand @tanstack/react-query @tanstack/react-query-devtools bullmq ioredis
```

### 1.2 Environment Variables Setup

Create/update `.env.local`:

```env
# Existing
DATABASE_URL=your_neon_database_url
BETTER_AUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# New for Veo3
GOOGLE_GENAI_API_KEY=your_google_genai_api_key
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Redis & BullMQ
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your_redis_password
```

### 1.3 Database Migration

- [ ] Run existing migrations: `pnpm drizzle-kit push`
- [ ] Verify all tables are created correctly
- [ ] Test database connection

done till here

### 1.4 Create Database Query Functions

Create `apps/web/src/lib/queries/` directory with:

#### `conversations.ts`

- [ ] `getConversations(userId: string)`
- [ ] `getConversationById(id: string)`
- [ ] `createConversation(data: NewConversation)`
- [ ] `updateConversation(id: string, data: Partial<Conversation>)`
- [ ] `deleteConversation(id: string)`
- [ ] `toggleConversationPin(id: string)`

#### `messages.ts`

- [ ] `getMessages(conversationId: string)`
- [ ] `createMessage(data: NewMessage)`
- [ ] `updateMessage(id: string, content: string)`
- [ ] `deleteMessage(id: string)`

#### `generations.ts`

- [ ] `createGeneration(data: NewGeneration)`
- [ ] `getGenerations(conversationId: string)`
- [ ] `updateGenerationStatus(id: string, status: GenerationStatus)`
- [ ] `getGenerationById(id: string)`
- [ ] `updateGenerationClarification(id: string, clarification: string)`
- [ ] `confirmGeneration(id: string)`

### 1.5 Redis & BullMQ Setup

Create `apps/web/src/lib/redis.ts`:

- [ ] Redis connection configuration
- [ ] Connection pooling setup
- [ ] Error handling and reconnection logic

Create `apps/web/src/lib/queues/` directory:

#### `generationQueue.ts`

- [ ] BullMQ queue configuration for video generation
- [ ] Job processing logic
- [ ] Retry policies and error handling
- [ ] Progress tracking

#### `queueWorker.ts`

- [ ] Worker setup for processing generation jobs
- [ ] Job status updates
- [ ] Veo3 API integration within workers
- [ ] Database updates from workers

---

## Phase 2: API Routes Development

### 2.1 Create API Route Structure

```
apps/web/src/app/api/
├── conversations/
│   ├── route.ts              # GET, POST
│   └── [id]/
│       ├── route.ts          # GET, PUT, DELETE
│       └── messages/
│           └── route.ts      # GET, POST
├── generations/
│   ├── route.ts              # POST (create generation request)
│   └── [id]/
│       ├── route.ts          # GET (poll status)
│       ├── clarify/
│       │   └── route.ts      # POST (submit clarification)
│       ├── confirm/
│       │   └── route.ts      # POST (confirm generation)
│       └── status/
│           └── route.ts      # PUT (update status)
└── queue/
    ├── jobs/
    │   └── [id]/
    │       └── route.ts      # GET (job status)
    └── workers/
        └── route.ts          # POST (start worker)
```

### 2.2 Implement API Routes

#### `api/conversations/route.ts`

- [ ] `GET` - Fetch user's conversations with pagination
- [ ] `POST` - Create new conversation
- [ ] Authentication middleware
- [ ] Input validation with Zod

#### `api/conversations/[id]/route.ts`

- [ ] `GET` - Get specific conversation with messages
- [ ] `PUT` - Update conversation (title, folder, etc.)
- [ ] `DELETE` - Soft delete conversation
- [ ] Authorization check (user owns conversation)

#### `api/conversations/[id]/messages/route.ts`

- [ ] `GET` - Get messages for conversation
- [ ] `POST` - Create new message
- [ ] Message validation and sanitization

#### `api/generations/route.ts`

- [ ] `POST` - Create generation request
- [ ] Validate prompt and parameters
- [ ] Create generation record in database with status "pending_clarification"
- [ ] Return generation ID for clarification flow

#### `api/generations/[id]/clarify/route.ts`

- [ ] `POST` - Submit clarification response
- [ ] Validate clarification input
- [ ] Update generation record with clarification
- [ ] Trigger AI clarification processing
- [ ] Return updated generation status

#### `api/generations/[id]/confirm/route.ts`

- [ ] `POST` - Confirm generation and start processing
- [ ] Validate generation is ready for processing
- [ ] Add job to BullMQ queue
- [ ] Update generation status to "queued"
- [ ] Return job ID for status polling

#### `api/generations/[id]/route.ts`

- [ ] `GET` - Get generation details and status
- [ ] Return generation metadata, current status, progress
- [ ] Include clarification history and confirmation status

#### `api/queue/jobs/[id]/route.ts`

- [ ] `GET` - Get job status from BullMQ
- [ ] Return job progress, status, and any errors
- [ ] Update database with latest job status

### 2.3 Error Handling & Validation

- [ ] Create consistent error response format
- [ ] Implement Zod schemas for all API inputs
- [ ] Add rate limiting for generation endpoints
- [ ] Handle Google GenAI API errors gracefully

---

## Phase 3: Zustand State Management

### 3.1 Create Store Structure

Create `apps/web/src/stores/` directory:

#### `useConversationStore.ts`

- [ ] State: conversations, selectedConversation, isLoading
- [ ] Actions:
  - `loadConversations()`
  - `selectConversation(id)`
  - `createConversation(data)`
  - `updateConversation(id, data)`
  - `deleteConversation(id)`
  - `togglePin(id)`

#### `useMessageStore.ts`

- [ ] State: messages, isTyping, currentMessage
- [ ] Actions:
  - `loadMessages(conversationId)`
  - `sendMessage(content, conversationId)`
  - `editMessage(id, content)`
  - `deleteMessage(id)`

#### `useGenerationStore.ts`

- [ ] State: generations, activeGenerations, isGenerating, pendingClarifications
- [ ] Actions:
  - `requestGeneration(prompt, conversationId)`
  - `submitClarification(generationId, clarification)`
  - `confirmGeneration(generationId)`
  - `pollGeneration(id)`
  - `updateGenerationStatus(id, status)`
  - `getGenerationResult(id)`

#### `useUIStore.ts`

- [ ] State: sidebarCollapsed, theme, searchQuery
- [ ] Actions: UI state management

### 3.2 Store Integration

- [ ] Connect stores to React Query for data persistence
- [ ] Implement optimistic updates for better UX
- [ ] Add store persistence for UI preferences

---

## Phase 4: React Query Integration

### 4.1 Setup Query Client

Create `apps/web/src/lib/react-query.ts`:

- [ ] Configure QueryClient with default options
- [ ] Setup devtools for development
- [ ] Configure retry and cache policies

### 4.2 Create Query Hooks

Create `apps/web/src/hooks/queries/` directory:

#### `useConversations.ts`

- [ ] `useConversations()` - Fetch user conversations
- [ ] `useConversation(id)` - Fetch specific conversation
- [ ] `useCreateConversation()` - Mutation for creating conversations
- [ ] `useUpdateConversation()` - Mutation for updating conversations

#### `useMessages.ts`

- [ ] `useMessages(conversationId)` - Fetch conversation messages
- [ ] `useSendMessage()` - Mutation for sending messages
- [ ] `useEditMessage()` - Mutation for editing messages

#### `useGenerations.ts`

- [ ] `useGenerations(conversationId)` - Fetch conversation generations
- [ ] `useRequestGeneration()` - Mutation for requesting video generation
- [ ] `useSubmitClarification()` - Mutation for submitting clarification
- [ ] `useConfirmGeneration()` - Mutation for confirming generation
- [ ] `usePollGeneration(id)` - Polling query for generation status
- [ ] `usePollJobStatus(jobId)` - Polling query for BullMQ job status

### 4.3 Query Configuration

- [ ] Setup automatic refetching for active conversations
- [ ] Configure stale time and cache time appropriately
- [ ] Implement real-time updates using polling for generations

---

## Phase 5: Veo3 Integration

### 5.1 Google GenAI Client Setup

Create `apps/web/src/lib/veo3.ts`:

- [ ] Initialize Google GenAI client with API key
- [ ] Create video generation function
- [ ] Implement polling mechanism for operation status
- [ ] Handle different generation scenarios (with/without image)

### 5.2 Generation Service

Create `apps/web/src/lib/services/generationService.ts`:

- [ ] `requestVideoGeneration(prompt, options)` - Create generation request
- [ ] `processClarification(generationId, clarification)` - Handle clarification
- [ ] `queueVideoGeneration(generationId)` - Add to BullMQ queue
- [ ] `pollJobStatus(jobId)` - Check BullMQ job status
- [ ] `downloadVideoResult(operationId)` - Download completed video
- [ ] `cancelGeneration(operationId)` - Cancel active generation

### 5.3 File Storage Integration

- [ ] Setup file storage for generated videos (AWS S3/Cloudflare R2)
- [ ] Implement secure file upload/download
- [ ] Add file cleanup for failed generations

### 5.4 Generation Workflow

**Step 1: User Request**

- [ ] User sends message with video generation intent
- [ ] Create message and generation record with status "pending_clarification"

**Step 2: Clarification**

- [ ] AI analyzes prompt and generates clarification questions
- [ ] User responds to clarification questions
- [ ] Update generation record with clarification responses

**Step 3: Confirmation**

- [ ] User confirms generation parameters
- [ ] Update generation status to "confirmed"

**Step 4: Queue Processing**

- [ ] Add generation job to BullMQ queue
- [ ] Update generation status to "queued"
- [ ] Worker picks up job and starts Veo3 generation

**Step 5: Status Polling**

- [ ] Poll BullMQ job status for progress updates
- [ ] Update database with progress and status
- [ ] Handle completion or errors

**Step 6: Completion**

- [ ] Update database with result URL
- [ ] Send completion message to user
- [ ] Clean up temporary files

---

## Phase 6: Component Integration

### 6.1 Update Dashboard Components

#### `DashboardLayout.tsx`

- [ ] Replace mock data with Zustand stores
- [ ] Integrate React Query hooks
- [ ] Remove mock data imports and functions
- [ ] Add loading states and error handling

#### `ChatPane.tsx`

- [ ] Connect to message store
- [ ] Implement real message sending
- [ ] Add generation status indicators
- [ ] Handle video result display

#### `Composer.tsx`

- [ ] Integrate with message store
- [ ] Add generation type selection
- [ ] Implement prompt templates for video generation
- [ ] Add file upload support for image inputs

#### `Sidebar.tsx`

- [ ] Connect to conversation store
- [ ] Implement real conversation management
- [ ] Add generation status indicators
- [ ] Update conversation previews

### 6.2 New Components

#### `ClarificationModal.tsx`

- [ ] Display AI clarification questions
- [ ] Form for user clarification responses
- [ ] Submit clarification to backend
- [ ] Handle clarification validation

#### `ConfirmationModal.tsx`

- [ ] Display final generation parameters
- [ ] Show estimated generation time
- [ ] Allow user to confirm or cancel
- [ ] Queue generation job on confirmation

#### `GenerationStatus.tsx`

- [ ] Display generation progress
- [ ] Show estimated time remaining
- [ ] Allow cancellation of generation
- [ ] Display result when complete

#### `QueueStatus.tsx`

- [ ] Show position in queue
- [ ] Display queue wait time
- [ ] Real-time queue updates
- [ ] Job priority indicators

#### `VideoPlayer.tsx`

- [ ] Play generated videos
- [ ] Download functionality
- [ ] Video metadata display
- [ ] Thumbnail generation

#### `GenerationSettings.tsx`

- [ ] Video duration selection
- [ ] Style and quality options
- [ ] Provider selection (future: multiple providers)
- [ ] Advanced parameters

---

## Phase 7: Real-time Features

### 7.1 Polling Implementation

- [ ] Implement automatic polling for active generations
- [ ] Poll BullMQ job status for queued generations
- [ ] Use React Query's built-in polling
- [ ] Handle network disconnection gracefully
- [ ] Optimize polling frequency based on generation stage
- [ ] Implement exponential backoff for queue polling

### 7.2 Status Updates

- [ ] Real-time generation status updates
- [ ] Progress indicators in UI
- [ ] Notification system for completed generations
- [ ] Error handling and retry mechanisms

---

## Phase 8: Testing & Optimization

### 8.1 Unit Tests

- [ ] Test database query functions
- [ ] Test API route handlers
- [ ] Test Zustand store actions
- [ ] Test React Query hooks

### 8.2 Integration Tests

- [ ] Test complete generation workflow
- [ ] Test conversation management
- [ ] Test error scenarios
- [ ] Test authentication flows

### 8.3 Performance Optimization

- [ ] Optimize database queries
- [ ] Implement proper caching strategies
- [ ] Add request debouncing
- [ ] Optimize bundle size

### 8.4 Error Handling

- [ ] Comprehensive error boundaries
- [ ] User-friendly error messages
- [ ] Retry mechanisms for failed operations
- [ ] Fallback UI states

---

## Phase 9: Production Readiness

### 9.1 Security

- [ ] Input sanitization and validation
- [ ] Rate limiting implementation
- [ ] API key security
- [ ] User authorization checks

### 9.2 Monitoring

- [ ] Error tracking (Sentry)
- [ ] Performance monitoring
- [ ] Usage analytics
- [ ] Generation success/failure metrics

### 9.3 Deployment

- [ ] Environment configuration
- [ ] Database migration scripts
- [ ] File storage setup
- [ ] CDN configuration for video delivery

---

## Implementation Priority

### High Priority (Week 1-2)

1. Database query functions
2. Basic API routes (conversations, messages)
3. Zustand store setup
4. React Query integration

### Medium Priority (Week 3-4)

1. Veo3 integration
2. Generation workflow
3. Component updates
4. Real-time polling

### Low Priority (Week 5+)

1. Advanced features
2. Testing and optimization
3. Production deployment
4. Monitoring and analytics

---

## Success Criteria

- [ ] Users can create and manage conversations
- [ ] Messages are persisted and retrieved correctly
- [ ] Clarification flow works smoothly (AI asks questions, user responds)
- [ ] Confirmation step allows users to review before generation
- [ ] Video generation works end-to-end with Veo3 via queue system
- [ ] Queue status is displayed and updated in real-time
- [ ] BullMQ job processing handles failures gracefully
- [ ] Real-time status updates during generation
- [ ] Generated videos are stored and accessible
- [ ] UI is responsive and provides good UX
- [ ] Error handling is comprehensive
- [ ] Performance is acceptable for production use

---

## Notes

- **Veo3 API**: Requires Google GenAI API key and has rate limits
- **Database**: Already well-structured, just need to implement queries
- **UI**: Dashboard is complete, needs integration with real data
- **State Management**: Zustand + React Query provides good separation of concerns
- **Queue System**: BullMQ with Redis provides robust job processing and scaling
- **Generation Flow**: Clarification → Confirmation → Queue → Processing → Completion
- **Real-time**: Polling BullMQ job status provides real-time updates
- **File Storage**: Consider using Cloudflare R2 for cost-effective video storage
- **Redis**: Required for BullMQ job queue and caching
- **Workers**: Separate worker processes handle actual Veo3 API calls

This checklist provides a comprehensive roadmap for transitioning from mock data to a fully functional chat system with Veo3 video generation capabilities using a queue-based architecture.
