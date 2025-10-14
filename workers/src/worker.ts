/**
 * Main Cloudflare Worker Entry Point
 *
 * This is the main entry point for the Nimu Generation Worker.
 * It handles all HTTP requests, routes them to appropriate services,
 * and coordinates between Durable Objects and R2 storage.
 *
 * Key Features:
 * - HTTP request routing
 * - Authentication middleware
 * - Error handling and logging
 * - CORS support
 * - Request validation
 * - Integration with Durable Objects and R2
 */

import { DurableObjectManager } from "./utils/durable-objects";
import { VideoStorageHelper } from "./utils/r2";
import { authenticateUser } from "./utils/auth";
import {
  validateGenerationRequest,
  validateClarificationRequest,
} from "./utils/validation";
import {
  RequestLogger,
  // PerformanceTracker, // TODO: Use for performance tracking
  RateLimiter,
  RATE_LIMIT_CONFIGS,
  ErrorHandler,
} from "./middleware";
import {
  GenerationWorkflow,
  type GenerationWorkflowConfig,
} from "./services/GenerationWorkflow";
import { modelRegistry } from "./services/providers";

// Environment interface combining all services
export interface Env {
  // Durable Objects
  JOB_MANAGER: DurableObjectNamespace;
  QUEUE_MANAGER: DurableObjectNamespace;

  // R2 Storage
  VIDEO_STORAGE: R2Bucket;

  // Environment variables
  ENVIRONMENT: string;
  MAX_CONCURRENT_JOBS: string;
  JOB_TIMEOUT: string;
  CLEANUP_RETENTION_DAYS: string;
  MAX_FILE_SIZE: string;
  R2_BASE_URL: string;
  THUMBNAIL_GENERATION_ENABLED: string;
  NEXTJS_URL: string;

  // Secrets (set via wrangler secrets)
  JWT_SECRET?: string;
  VEO3_API_KEY?: string;
  VEO3_API_URL?: string;
  DATABASE_URL?: string;
}

// CORS headers for all responses
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Requested-With",
  "Access-Control-Max-Age": "86400",
};

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
  const startTime = Date.now();

  try {
    console.log("[BACKGROUND_PROCESSING] Starting generation", {
      requestId,
      generationId,
      userId,
      prompt,
      timestamp: new Date().toISOString(),
    });

    // Initialize GenerationWorkflow
    const config: GenerationWorkflowConfig = {
      providers: {
        google: {
          apiKey: env.VEO3_API_KEY!,
          baseUrl:
            env.VEO3_API_URL ||
            "https://generativelanguage.googleapis.com/v1beta",
        },
      },
      maxRetries: 3,
      pollingInterval: 5000,
      timeoutMs: 300000,
      enableClarifications: false,
      enableProgressTracking: true,
    };

    const workflow = new GenerationWorkflow(
      config,
      durableObjectManager,
      videoStorage
    );

    // Step 1: Start generation (setup)
    const selectedModel =
      parameters.selectedModel || modelRegistry.getDefaultModel().id;
    const startResult = await workflow.startGeneration(
      userId,
      prompt,
      parameters,
      selectedModel
    );

    if (!startResult.success) {
      console.error("[BACKGROUND_PROCESSING] Start generation failed", {
        requestId,
        generationId,
        error: startResult.error,
        timestamp: new Date().toISOString(),
      });

      await sendWebhookToNextJS(
        {
          event: "generation.failed",
          jobId: generationId,
          generationId: generationId,
          userId: userId,
          status: "failed",
          error: startResult.error,
          timestamp: new Date().toISOString(),
        },
        env
      );
      return;
    }

    console.log("[BACKGROUND_PROCESSING] Generation started, now confirming", {
      requestId,
      generationId,
      workflowGenerationId: startResult.generationId,
      timestamp: new Date().toISOString(),
    });

    // Step 2: Confirm generation (calls Veo3 API)
    const confirmResult = await workflow.confirmGeneration(
      startResult.generationId!
    );

    if (!confirmResult.success) {
      console.error("[BACKGROUND_PROCESSING] Confirm generation failed", {
        requestId,
        generationId,
        error: confirmResult.error,
        timestamp: new Date().toISOString(),
      });

      await sendWebhookToNextJS(
        {
          event: "generation.failed",
          jobId: generationId,
          generationId: generationId,
          userId: userId,
          status: "failed",
          error: confirmResult.error,
          timestamp: new Date().toISOString(),
        },
        env
      );
      return;
    }

    console.log(
      "[BACKGROUND_PROCESSING] Generation confirmed, now processing",
      {
        requestId,
        generationId,
        operationId: confirmResult.operationId,
        timestamp: new Date().toISOString(),
      }
    );

    // Step 3: Process generation (poll until complete)
    let processResult = await workflow.processGeneration(
      startResult.generationId!
    );

    // Poll until completion or failure with exponential backoff
    let attempts = 0;
    let delay = 5000; // Start with 5 seconds
    const maxAttempts = 20; // Reduced from 60 to 20
    const maxDelay = 30000; // Maximum 30 seconds between polls

    while (
      processResult.success &&
      !processResult.videoUrl &&
      attempts < maxAttempts
    ) {
      attempts++;
      console.log(
        `[BACKGROUND_PROCESSING] Polling attempt ${attempts}/${maxAttempts} (delay: ${delay}ms)`,
        {
          requestId,
          generationId,
          timestamp: new Date().toISOString(),
        }
      );

      // Wait with exponential backoff
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Increase delay for next iteration (exponential backoff)
      delay = Math.min(delay * 1.8, maxDelay);

      // Poll again
      processResult = await workflow.processGeneration(
        startResult.generationId!
      );

      if (!processResult.success) {
        console.log("[BACKGROUND_PROCESSING] Polling failed", {
          requestId,
          generationId,
          error: processResult.error,
          timestamp: new Date().toISOString(),
        });
        break;
      }
    }

    console.log("[BACKGROUND_PROCESSING] Generation workflow completed", {
      requestId,
      generationId,
      success: processResult.success,
      videoUrl: processResult.videoUrl,
      attempts,
      timestamp: new Date().toISOString(),
    });

    // Send webhook to Next.js
    if (processResult.success && processResult.videoUrl) {
      await sendWebhookToNextJS(
        {
          event: "generation.completed",
          jobId: generationId,
          generationId: generationId,
          userId: userId,
          status: "completed",
          result: {
            videoUrl: processResult.videoUrl,
            duration: parameters.duration,
            processingTime: Date.now() - startTime,
          },
          timestamp: new Date().toISOString(),
        },
        env
      );
    } else {
      await sendWebhookToNextJS(
        {
          event: "generation.failed",
          jobId: generationId,
          generationId: generationId,
          userId: userId,
          status: "failed",
          error: processResult.error || "Generation failed or timed out",
          timestamp: new Date().toISOString(),
        },
        env
      );
    }
  } catch (error) {
    console.error("[BACKGROUND_PROCESSING] Error", {
      requestId,
      generationId,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });

    // Send failure webhook
    await sendWebhookToNextJS(
      {
        event: "generation.failed",
        jobId: generationId,
        generationId: generationId,
        userId: userId,
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      env
    );
  }
}

/**
 * Send webhook to Next.js
 */
async function sendWebhookToNextJS(data: any, env: Env): Promise<void> {
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

/**
 * Main Worker object
 */
const Worker = {
  async fetch(
    request: Request,
    env: Env,
    _ctx: ExecutionContext
  ): Promise<Response> {
    const requestId = RequestLogger.generateRequestId();
    const startTime = Date.now();
    let requestLog: any;

    try {
      // Handle CORS preflight requests
      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: CORS_HEADERS,
        });
      }

      const url = new URL(request.url);
      const path = url.pathname;
      const method = request.method;

      // Log incoming request
      requestLog = RequestLogger.logRequest(request, requestId);
      // const performanceTracker = new PerformanceTracker(requestLog); // TODO: Use for performance tracking

      // Initialize rate limiter
      RateLimiter.initialize();

      // Apply rate limiting based on path
      const rateLimitConfig = this.getRateLimitConfig(path);
      const rateLimitResult = RateLimiter.checkLimit(request, rateLimitConfig);

      if (!rateLimitResult.allowed) {
        const response = new Response(
          JSON.stringify({
            error: "Rate limit exceeded",
            message: "Too many requests. Please try again later.",
            retryAfter: rateLimitResult.retryAfter,
          }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              ...RateLimiter.getHeaders(rateLimitResult),
            },
          }
        );

        RequestLogger.logResponse(
          requestLog,
          429,
          Date.now() - startTime,
          "Rate limit exceeded"
        );
        return this.addCorsHeaders(response);
      }

      // Add CORS headers to all responses
      const addCorsHeaders = (response: Response) => {
        Object.entries(CORS_HEADERS).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
        // Add rate limit headers
        Object.entries(RateLimiter.getHeaders(rateLimitResult)).forEach(
          ([key, value]) => {
            response.headers.set(key, value);
          }
        );
        return response;
      };

      // Initialize services
      const durableObjectManager = new DurableObjectManager(env);
      const videoStorage = new VideoStorageHelper(env);

      // Route requests
      let response: Response;

      // Health check endpoint
      if (path === "/health" && method === "GET") {
        response = await handleHealthCheck(env);
      }

      // Models endpoint
      else if (path === "/api/models" && method === "GET") {
        response = await handleModelsEndpoint();
      }

      // Generation endpoints
      else if (path.startsWith("/api/generations")) {
        response = await handleGenerationRoutes(
          request,
          durableObjectManager,
          videoStorage,
          env,
          _ctx
        );
      }

      // Queue endpoints
      else if (path.startsWith("/api/queue")) {
        response = await handleQueueRoutes(request, durableObjectManager, env);
      }

      // Storage endpoints
      else if (path.startsWith("/api/storage")) {
        response = await handleStorageRoutes(request, videoStorage, env);
      }

      // Worker management endpoints
      else if (path.startsWith("/api/workers")) {
        response = await handleWorkerRoutes(request, durableObjectManager, env);
      }

      // Cron job endpoints (for cleanup)
      else if (path.startsWith("/api/cron")) {
        response = await handleCronRoutes(
          request,
          durableObjectManager,
          videoStorage,
          env
        );
      } else {
        response = new Response(JSON.stringify({ error: "Not Found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      return addCorsHeaders(response);
    } catch (error) {
      const duration = Date.now() - startTime;

      if (requestLog) {
        RequestLogger.logError(
          requestLog,
          error instanceof Error ? error : new Error(String(error))
        );
        RequestLogger.logResponse(
          requestLog,
          500,
          duration,
          error instanceof Error ? error.message : "Unknown error"
        );
      }

      const errorResponse = ErrorHandler.handleError(
        error instanceof Error ? error : new Error(String(error)),
        request,
        requestId
      );

      // Add CORS headers even for errors
      Object.entries(CORS_HEADERS).forEach(([key, value]) => {
        errorResponse.headers.set(key, value);
      });

      return errorResponse;
    }
  },

  /**
   * Get rate limit configuration based on path
   */
  getRateLimitConfig(path: string): any {
    if (path.startsWith("/api/generations")) {
      return RATE_LIMIT_CONFIGS.API_GENERATIONS;
    } else if (path.startsWith("/api/storage")) {
      return RATE_LIMIT_CONFIGS.API_STORAGE;
    } else if (path.startsWith("/api/workers")) {
      return RATE_LIMIT_CONFIGS.API_WORKERS;
    } else {
      return RATE_LIMIT_CONFIGS.API_GENERAL;
    }
  },

  /**
   * Add CORS headers to response
   */
  addCorsHeaders(response: Response): Response {
    Object.entries(CORS_HEADERS).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  },

  /**
   * Handle scheduled events (cron jobs)
   */
  async scheduled(
    event: ScheduledEvent,
    env: Env,
    _ctx: ExecutionContext
  ): Promise<void> {
    console.log("Scheduled event triggered:", event.cron);

    try {
      const durableObjectManager = new DurableObjectManager(env);
      const videoStorage = new VideoStorageHelper(env);

      // Daily cleanup job
      if (event.cron === "0 2 * * *") {
        await handleDailyCleanup(durableObjectManager, videoStorage, env);
      }
    } catch (error) {
      console.error("Scheduled event error:", error);
    }
  },
};

/**
 * Health check endpoint
 */
async function handleHealthCheck(env: Env): Promise<Response> {
  const health = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: env.ENVIRONMENT,
    services: {
      durableObjects: "available",
      r2Storage: "available",
      environment: env.ENVIRONMENT,
    },
    version: "1.0.0",
  };

  return new Response(JSON.stringify(health), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Handle generation-related routes
 */
async function handleGenerationRoutes(
  request: Request,
  durableObjectManager: DurableObjectManager,
  videoStorage: VideoStorageHelper,
  env: Env,
  _ctx: ExecutionContext
): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  try {
    // Authenticate user
    const authResult = await authenticateUser(request, env);
    if (!authResult.success) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const userId = authResult.userId;

    // POST /api/generations - Create new generation
    if (path === "/api/generations" && method === "POST") {
      const body = await request.json();
      const validation = validateGenerationRequest(body);

      if (!validation.valid) {
        return new Response(
          JSON.stringify({ error: validation.error || "Validation failed" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      const generationData = {
        ...(body as Record<string, any>),
        id: (body as any).generationId || generateId(), // ← Use provided ID or generate new one
        userId,
        status: "pending_clarification",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

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

      if (!result.success) {
        return new Response(JSON.stringify({ error: result.error }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      // ✅ START PROCESSING IMMEDIATELY
      if (result.success) {
        // Trigger background processing
        _ctx.waitUntil(
          processGenerationInBackground(
            generationData.id,
            userId!,
            ((generationData as any).prompt as string) ?? "",
            (generationData as any).parameters || {},
            durableObjectManager,
            videoStorage,
            env
          )
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          generationId: generationData.id,
          queuePosition: result.queuePosition,
        }),
        {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // GET /api/generations/:id - Get generation status
    else if (path.match(/^\/api\/generations\/([^\/]+)$/) && method === "GET") {
      const generationId = path.split("/")[3];

      const result = await durableObjectManager.jobManager.getJobStatus(
        generationId!
      );

      if (!result.success) {
        return new Response(JSON.stringify({ error: result.error }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({
          success: true,
          generation: result.result,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // POST /api/generations/:id/clarify - Submit clarification
    else if (
      path.match(/^\/api\/generations\/([^\/]+)\/clarify$/) &&
      method === "POST"
    ) {
      const generationId = path.split("/")[3];
      const body = await request.json();

      const validation = validateClarificationRequest(body);
      if (!validation.valid) {
        return new Response(
          JSON.stringify({ error: validation.error || "Validation failed" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Update generation with clarification
      const result = await durableObjectManager.jobManager.updateJobStatus(
        generationId!,
        "pending_confirmation",
        { clarification: body }
      );

      if (!result.success) {
        return new Response(JSON.stringify({ error: result.error }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // POST /api/generations/:id/confirm - Confirm generation
    else if (
      path.match(/^\/api\/generations\/([^\/]+)\/confirm$/) &&
      method === "POST"
    ) {
      const generationId = path.split("/")[3];

      // Update status to confirmed and add to queue
      const result = await durableObjectManager.jobManager.updateJobStatus(
        generationId!,
        "confirmed"
      );

      if (!result.success) {
        return new Response(JSON.stringify({ error: result.error }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } else {
      return new Response(JSON.stringify({ error: "Not Found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("Generation route error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * Handle queue-related routes
 */
async function handleQueueRoutes(
  request: Request,
  durableObjectManager: DurableObjectManager,
  _env: Env
): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  try {
    // GET /api/queue/jobs/:id - Get job status
    if (path.match(/^\/api\/queue\/jobs\/([^\/]+)$/) && method === "GET") {
      const jobId = path.split("/")[4];

      const result = await durableObjectManager.jobManager.getJobStatus(jobId!);

      if (!result.success) {
        return new Response(JSON.stringify({ error: result.error }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({
          success: true,
          job: result.result,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // GET /api/queue/stats - Get queue statistics
    else if (path === "/api/queue/stats" && method === "GET") {
      const result = await durableObjectManager.queueManager.getQueueStats();

      if (!result.success) {
        return new Response(JSON.stringify({ error: result.error }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({
          success: true,
          stats: result.result,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // GET /api/queue/status - Get queue status
    else if (path === "/api/queue/status" && method === "GET") {
      const result = await durableObjectManager.queueManager.getQueueStatus();

      if (!result.success) {
        return new Response(JSON.stringify({ error: result.error }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({
          success: true,
          status: result.result,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } else {
      return new Response(JSON.stringify({ error: "Not Found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("Queue route error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * Handle storage-related routes
 */
async function handleStorageRoutes(
  request: Request,
  videoStorage: VideoStorageHelper,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  try {
    // Authenticate user
    const authResult = await authenticateUser(request, env);
    if (!authResult.success) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const userId = authResult.userId;

    // GET /api/storage/videos/:id - Get video URL
    if (path.match(/^\/api\/storage\/videos\/([^\/]+)$/) && method === "GET") {
      const videoId = path.split("/")[4];

      const result = await videoStorage.generateSignedUrl(videoId!, {
        expiresIn: 3600, // 1 hour
        allowDownload: true,
      });

      if (!result.success) {
        return new Response(JSON.stringify({ error: result.error }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({
          success: true,
          videoUrl: result.url,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // DELETE /api/storage/videos/:id - Delete video
    else if (
      path.match(/^\/api\/storage\/videos\/([^\/]+)$/) &&
      method === "DELETE"
    ) {
      const videoId = path.split("/")[4];

      const result = await videoStorage.deleteVideo(videoId!);

      if (!result.success) {
        return new Response(JSON.stringify({ error: result.error }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // GET /api/storage/videos - List user videos
    else if (path === "/api/storage/videos" && method === "GET") {
      const result = await videoStorage.listVideos(userId);

      if (!result.success) {
        return new Response(JSON.stringify({ error: result.error }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({
          success: true,
          videos: result.videos,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } else {
      return new Response(JSON.stringify({ error: "Not Found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("Storage route error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * Handle worker management routes
 */
async function handleWorkerRoutes(
  request: Request,
  durableObjectManager: DurableObjectManager,
  _env: Env
): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  try {
    // POST /api/workers/register - Register worker
    if (path === "/api/workers/register" && method === "POST") {
      const body = (await request.json()) as any;

      const result = await durableObjectManager.queueManager.registerWorker(
        body.workerId,
        body.workerInfo
      );

      if (!result.success) {
        return new Response(JSON.stringify({ error: result.error }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }

    // POST /api/workers/heartbeat - Worker heartbeat
    else if (path === "/api/workers/heartbeat" && method === "POST") {
      const body = (await request.json()) as any;

      const result =
        await durableObjectManager.queueManager.updateWorkerHeartbeat(
          body.workerId
        );

      if (!result.success) {
        return new Response(JSON.stringify({ error: result.error }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } else {
      return new Response(JSON.stringify({ error: "Not Found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("Worker route error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * Handle cron job routes
 */
async function handleCronRoutes(
  request: Request,
  durableObjectManager: DurableObjectManager,
  videoStorage: VideoStorageHelper,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  try {
    // POST /api/cron/cleanup - Manual cleanup trigger
    if (path === "/api/cron/cleanup" && method === "POST") {
      const result = await handleDailyCleanup(
        durableObjectManager,
        videoStorage,
        env
      );

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } else {
      return new Response(JSON.stringify({ error: "Not Found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("Cron route error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * Handle daily cleanup tasks
 */
async function handleDailyCleanup(
  durableObjectManager: DurableObjectManager,
  videoStorage: VideoStorageHelper,
  env: Env
): Promise<{ success: boolean; results?: any; error?: string }> {
  try {
    console.log("Starting daily cleanup...");

    const retentionDays = parseInt(env.CLEANUP_RETENTION_DAYS) || 7;

    // Clean up old jobs
    const jobCleanupResult =
      await durableObjectManager.jobManager.cleanupOldJobs(retentionDays);

    // Clean up old videos
    const videoCleanupResult =
      await videoStorage.cleanupOldVideos(retentionDays);

    // Clean up inactive workers
    const workerCleanupResult =
      await durableObjectManager.queueManager.cleanupInactiveWorkers(5);

    const jobsCleaned = (jobCleanupResult as any).cleanedCount || 0;
    const videosCleaned = (videoCleanupResult as any).cleanedCount || 0;
    const workersCleaned = (workerCleanupResult as any).cleanedCount || 0;

    console.log("Daily cleanup completed:", {
      jobsCleaned,
      videosCleaned,
      workersCleaned,
    });

    return {
      success: true,
      results: {
        jobsCleaned,
        videosCleaned,
        workersCleaned,
      },
    };
  } catch (error) {
    console.error("Daily cleanup error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Handle models endpoint
 */
async function handleModelsEndpoint(): Promise<Response> {
  try {
    const models = modelRegistry.getAllModels();
    const groupedModels = modelRegistry.getModelsGroupedByProvider();
    const defaultModel = modelRegistry.getDefaultModel();

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          models,
          groupedModels,
          defaultModel,
          providers: modelRegistry.getProviders(),
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      }
    );
  } catch (error) {
    console.error("[WORKER] Failed to get models:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to retrieve models",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      }
    );
  }
}

/**
 * Generate unique ID
 */
function generateId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `gen_${timestamp}_${random}`;
}

// Export the worker as default
export default Worker;

// Export Durable Objects
export { JobManagerDO, QueueManagerDO } from "./durable-objects";
