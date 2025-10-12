/**
 * Service Usage Examples
 *
 * This file demonstrates how to use the Veo3 services and generation workflow
 * in your Cloudflare Worker application.
 */

import { DurableObjectManager } from "../utils/durable-objects";
import { VideoStorageHelper } from "../utils/r2";
import {
  createVeo3Service,
  createGenerationWorkflow,
  createWorkerService,
  type Veo3GenerationRequest,
  type GenerationWorkflowConfig,
  type WorkerServiceConfig,
} from "../services";

// Example 1: Basic Veo3 Service Usage
export async function exampleVeo3Service() {
  // Initialize Veo3 service
  const veo3Service = createVeo3Service("your-veo3-api-key");

  // Generate a video
  const request: Veo3GenerationRequest = {
    prompt: "A beautiful sunset over mountains",
    model: "veo-3",
    duration: 5,
    aspect_ratio: "16:9",
    quality: "standard",
  };

  const result = await veo3Service.generateVideo(request);

  if (result.success) {
    console.log("Generation started:", result.data!.operation_id);

    // Poll for completion
    const operationId = result.data!.operation_id;
    let completed = false;

    while (!completed) {
      const status = await veo3Service.pollOperation(operationId);

      if (status.success) {
        console.log("Status:", status.data!.status);

        if (status.data!.status === "completed") {
          const videoResult = await veo3Service.getResult(operationId);
          if (videoResult.success) {
            console.log("Video URL:", videoResult.data!.video_url);
            completed = true;
          }
        } else if (status.data!.status === "failed") {
          console.error("Generation failed:", status.data!.error);
          completed = true;
        }
      }

      // Wait before polling again
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

// Example 2: Generation Workflow Usage
export async function exampleGenerationWorkflow(env: any) {
  // Initialize services
  const durableObjectManager = new DurableObjectManager(env);
  const videoStorage = new VideoStorageHelper(env);

  // Configure workflow
  const config: GenerationWorkflowConfig = {
    veo3ApiKey: env.VEO3_API_KEY,
    veo3BaseUrl: "https://api.veo3.com",
    maxRetries: 3,
    pollingInterval: 5000,
    timeoutMs: 30000,
    enableClarifications: true,
    enableProgressTracking: true,
  };

  const workflow = createGenerationWorkflow(
    config,
    durableObjectManager,
    videoStorage
  );

  // Start generation
  const userId = "user_123";
  const prompt = "A cat playing with a ball of yarn";
  const parameters = {
    duration: 10,
    aspect_ratio: "16:9",
    quality: "high",
  };

  const startResult = await workflow.startGeneration(
    userId,
    prompt,
    parameters
  );

  if (startResult.success) {
    console.log("Generation started:", startResult.generationId);

    // Handle clarifications if needed
    if (startResult.clarificationRequired) {
      const clarifications = [
        { questionId: "duration", response: "10 seconds" },
        { questionId: "quality", response: "high" },
      ];

      await workflow.submitClarification(
        startResult.generationId!,
        clarifications
      );
    }

    // Confirm and start processing
    const confirmResult = await workflow.confirmGeneration(
      startResult.generationId!
    );

    if (confirmResult.success) {
      console.log("Generation confirmed:", confirmResult.operationId);

      // Process until completion
      let processing = true;
      while (processing) {
        const processResult = await workflow.processGeneration(
          startResult.generationId!
        );

        if (processResult.success) {
          if (processResult.videoUrl) {
            console.log("Video completed:", processResult.videoUrl);
            processing = false;
          } else {
            console.log("Still processing...");
            await new Promise((resolve) => setTimeout(resolve, 5000));
          }
        } else {
          console.error("Processing failed:", processResult.error);
          processing = false;
        }
      }
    }
  }
}

// Example 3: Worker Service Usage
export async function exampleWorkerService(env: any) {
  // Initialize services
  const durableObjectManager = new DurableObjectManager(env);
  const videoStorage = new VideoStorageHelper(env);

  // Configure worker
  const config: WorkerServiceConfig = {
    veo3ApiKey: env.VEO3_API_KEY,
    veo3BaseUrl: "https://api.veo3.com",
    maxConcurrentJobs: 5,
    pollingInterval: 10000,
    timeoutMs: 30000,
    enableClarifications: true,
    enableProgressTracking: true,
    retryAttempts: 3,
  };

  const workerService = createWorkerService(
    config,
    durableObjectManager,
    videoStorage
  );

  // Start worker
  await workerService.start();

  console.log("Worker started:", workerService.getWorkerStatus());

  // Monitor worker
  setInterval(() => {
    const stats = workerService.getWorkerStats();
    console.log("Worker stats:", stats);
  }, 30000);

  // Stop worker (in real usage, this would be called on shutdown)
  // await workerService.stop();
}

// Example 4: Integration with Cloudflare Worker
export async function exampleWorkerIntegration(request: Request, env: any) {
  const url = new URL(request.url);
  const path = url.pathname;

  // Initialize services
  const durableObjectManager = new DurableObjectManager(env);
  const videoStorage = new VideoStorageHelper(env);

  if (path === "/api/generate") {
    const body = (await request.json()) as any;

    // Create generation workflow
    const workflow = createGenerationWorkflow(
      {
        veo3ApiKey: env.VEO3_API_KEY,
        veo3BaseUrl: "https://api.veo3.com",
        maxRetries: 3,
        pollingInterval: 5000,
        timeoutMs: 30000,
        enableClarifications: true,
        enableProgressTracking: true,
      },
      durableObjectManager,
      videoStorage
    );

    // Start generation
    const result = await workflow.startGeneration(
      body.userId,
      body.prompt,
      body.parameters || {}
    );

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (path.startsWith("/api/status/")) {
    const generationId = path.split("/")[3];

    const jobResult =
      await durableObjectManager.jobManager.getJobStatus(generationId);

    return new Response(JSON.stringify(jobResult), {
      status: jobResult.success ? 200 : 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response("Not found", { status: 404 });
}

// Example 5: Error Handling and Retry Logic
export async function exampleErrorHandling() {
  const veo3Service = createVeo3Service("your-veo3-api-key");

  try {
    // Validate prompt first
    const validation = await veo3Service.validatePrompt("Invalid prompt");

    if (!validation.success) {
      console.error("Validation failed:", validation.error);
      return;
    }

    if (!validation.valid) {
      console.log("Prompt suggestions:", validation.suggestions);
      return;
    }

    // Estimate cost
    const costEstimate = await veo3Service.estimateCost({
      prompt: "A beautiful landscape",
      duration: 5,
    });

    if (costEstimate.success) {
      console.log("Estimated cost:", costEstimate.cost, costEstimate.currency);
    }

    // Generate with error handling
    const result = await veo3Service.generateVideo({
      prompt: "A beautiful landscape",
      duration: 5,
    });

    if (!result.success) {
      console.error("Generation failed:", result.error);

      // Handle specific error types
      if (result.error?.includes("rate limit")) {
        console.log("Rate limited, retrying later...");
      } else if (result.error?.includes("invalid prompt")) {
        console.log("Prompt validation failed");
      }
      return;
    }

    console.log("Generation started successfully");
  } catch (error) {
    console.error("Unexpected error:", error);
  }
}

// Example 6: Batch Processing
export async function exampleBatchProcessing(env: any) {
  const durableObjectManager = new DurableObjectManager(env);
  const videoStorage = new VideoStorageHelper(env);

  const prompts = ["A cat playing", "A dog running", "A bird flying"];

  const workflow = createGenerationWorkflow(
    {
      veo3ApiKey: env.VEO3_API_KEY,
      veo3BaseUrl: "https://api.veo3.com",
      maxRetries: 3,
      pollingInterval: 5000,
      timeoutMs: 30000,
      enableClarifications: false, // Disable for batch
      enableProgressTracking: true,
    },
    durableObjectManager,
    videoStorage
  );

  // Start all generations
  const generations = await Promise.all(
    prompts.map((prompt) =>
      workflow.startGeneration("batch_user", prompt, { duration: 5 })
    )
  );

  console.log(
    "Started generations:",
    generations.map((g) => g.generationId)
  );

  // Confirm all generations
  const confirmations = await Promise.all(
    generations
      .filter((g) => g.success)
      .map((g) => workflow.confirmGeneration(g.generationId!))
  );

  console.log("Confirmed generations:", confirmations.length);
}
