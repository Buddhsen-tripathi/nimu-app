/**
 * Generation Workflow Service
 *
 * This service orchestrates the complete video generation workflow,
 * integrating Veo3 API with Durable Objects for state management.
 *
 * Key Features:
 * - Complete generation workflow orchestration
 * - Clarification handling
 * - Progress tracking
 * - Error handling and recovery
 * - Integration with JobManager and QueueManager
 */

import {
  Veo3Service,
  createVeo3Service,
  type Veo3GenerationRequest,
} from "./Veo3Service";
import { DurableObjectManager } from "../utils/durable-objects";
import { VideoStorageHelper } from "../utils/r2";

export interface GenerationWorkflowConfig {
  veo3ApiKey: string;
  veo3BaseUrl?: string;
  maxRetries: number;
  pollingInterval: number;
  timeoutMs: number;
  enableClarifications: boolean;
  enableProgressTracking: boolean;
}

export interface WorkflowResult {
  success: boolean;
  generationId?: string;
  operationId?: string;
  videoUrl?: string;
  error?: string;
  clarificationRequired?: boolean;
  clarificationQuestions?: string[];
}

export interface ClarificationResponse {
  questionId: string;
  response: string;
}

export class GenerationWorkflow {
  private veo3Service: Veo3Service;
  private durableObjectManager: DurableObjectManager;
  private videoStorage: VideoStorageHelper;
  private config: GenerationWorkflowConfig;

  constructor(
    config: GenerationWorkflowConfig,
    durableObjectManager: DurableObjectManager,
    videoStorage: VideoStorageHelper
  ) {
    this.config = config;
    this.veo3Service = createVeo3Service(
      config.veo3ApiKey,
      config.veo3BaseUrl || "https://generativelanguage.googleapis.com/v1beta"
    );
    this.durableObjectManager = durableObjectManager;
    this.videoStorage = videoStorage;
  }

  /**
   * Start a new generation workflow
   */
  async startGeneration(
    userId: string,
    prompt: string,
    parameters: Record<string, any> = {}
  ): Promise<WorkflowResult> {
    const requestId = `gen_start_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      console.log("[GENERATION_WORKFLOW] Starting generation", {
        requestId,
        userId,
        prompt,
        parameters,
        timestamp: new Date().toISOString(),
      });

      // 1. Validate prompt
      console.log("[GENERATION_WORKFLOW] Validating prompt", {
        requestId,
        prompt,
        timestamp: new Date().toISOString(),
      });

      const validation = await this.veo3Service.validatePrompt(prompt);
      if (!validation.success) {
        console.error("[GENERATION_WORKFLOW] Validation failed", {
          requestId,
          error: validation.error,
          timestamp: new Date().toISOString(),
        });
        return {
          success: false,
          error: validation.error || "Validation failed",
        };
      }

      if (!validation.valid) {
        console.log(
          "[GENERATION_WORKFLOW] Invalid prompt, clarification required",
          {
            requestId,
            suggestions: validation.suggestions,
            timestamp: new Date().toISOString(),
          }
        );
        return {
          success: false,
          error: "Invalid prompt",
          clarificationRequired: true,
          clarificationQuestions: validation.suggestions || [],
        };
      }

      // 2. Estimate cost
      console.log("[GENERATION_WORKFLOW] Estimating cost", {
        requestId,
        prompt,
        parameters,
        timestamp: new Date().toISOString(),
      });

      const costEstimate = await this.estimateGenerationCost(
        prompt,
        parameters
      );
      if (!costEstimate.success) {
        console.warn("[GENERATION_WORKFLOW] Failed to estimate cost", {
          requestId,
          error: costEstimate.error,
          timestamp: new Date().toISOString(),
        });
      } else {
        console.log("[GENERATION_WORKFLOW] Cost estimated", {
          requestId,
          cost: costEstimate.cost,
          timestamp: new Date().toISOString(),
        });
      }

      // 3. Create job in JobManager
      const generationId = this.generateId();
      console.log("[GENERATION_WORKFLOW] Creating job", {
        requestId,
        generationId,
        userId,
        timestamp: new Date().toISOString(),
      });

      const jobResult = await this.durableObjectManager.createAndQueueJob({
        id: generationId,
        generationId,
        userId,
        prompt,
        parameters,
        provider: "veo3",
        model: parameters.model || "veo-3",
        priority: parameters.priority || 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      if (!jobResult.success) {
        console.error("[GENERATION_WORKFLOW] Failed to create job", {
          requestId,
          generationId,
          error: jobResult.error,
          timestamp: new Date().toISOString(),
        });
        return { success: false, error: jobResult.error || "Job not found" };
      }

      // 4. Update job status to pending
      await this.durableObjectManager.jobManager.updateJobStatus(
        generationId,
        "pending_clarification",
        { costEstimate: costEstimate.cost }
      );

      console.log("[GENERATION_WORKFLOW] Generation workflow started", {
        requestId,
        generationId,
        userId,
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        generationId,
        clarificationRequired: this.config.enableClarifications,
        clarificationQuestions: this.generateClarificationQuestions(
          prompt,
          parameters
        ),
      };
    } catch (error) {
      console.error("[GENERATION_WORKFLOW] Generation workflow start error", {
        requestId,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Submit clarification response
   */
  async submitClarification(
    generationId: string,
    clarifications: ClarificationResponse[]
  ): Promise<WorkflowResult> {
    try {
      console.log(`Submitting clarifications for generation ${generationId}`);

      // Update job with clarifications
      const updateResult =
        await this.durableObjectManager.jobManager.updateJobStatus(
          generationId,
          "pending_confirmation",
          { clarifications }
        );

      if (!updateResult.success) {
        return { success: false, error: updateResult.error || "Update failed" };
      }

      return { success: true, generationId };
    } catch (error) {
      console.error("Clarification submission error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Confirm and start generation
   */
  async confirmGeneration(generationId: string): Promise<WorkflowResult> {
    try {
      console.log(`Confirming generation ${generationId}`);

      // 1. Get job details
      const jobResult =
        await this.durableObjectManager.jobManager.getJobStatus(generationId);
      if (!jobResult.success) {
        return { success: false, error: "Generation not found" };
      }

      const jobData = jobResult.result as any;

      // Debug: Log job data to see what we have
      console.log("[GENERATION_WORKFLOW] Job data retrieved", {
        generationId,
        jobData: JSON.stringify(jobData, null, 2),
        timestamp: new Date().toISOString(),
      });

      // 2. Prepare Veo3 request
      const actualJobData = jobData.jobState?.data || jobData;
      const veo3Request: Veo3GenerationRequest = {
        prompt: actualJobData.prompt,
        model: actualJobData.model,
        duration: actualJobData.parameters?.duration || 5,
        aspect_ratio: actualJobData.parameters?.aspect_ratio || "16:9",
        quality: actualJobData.parameters?.quality || "standard",
        ...actualJobData.parameters,
      };

      // 3. Start Veo3 generation
      const veo3Result = await this.veo3Service.generateVideo(veo3Request);
      if (!veo3Result.success) {
        return {
          success: false,
          error: veo3Result.error || "Veo3 generation failed",
        };
      }

      const operationId = veo3Result.data!.operation_id;

      // 4. Update job with operation ID
      await this.durableObjectManager.jobManager.updateJobStatus(
        generationId,
        "processing",
        {
          operationId,
          veo3Status: veo3Result.data!.status,
          startedAt: new Date(),
        }
      );

      // 5. Add to queue for processing
      await this.durableObjectManager.queueManager.addToQueue({
        id: generationId,
        generationId,
        userId: jobData.userId,
        prompt: jobData.prompt,
        parameters: jobData.parameters,
        provider: jobData.provider,
        model: jobData.model,
        priority: jobData.priority,
        operationId,
        createdAt: jobData.createdAt,
        updatedAt: new Date(),
      });

      console.log(
        `Generation confirmed and queued: ${generationId} (operation: ${operationId})`
      );
      return { success: true, generationId, operationId };
    } catch (error) {
      console.error("Generation confirmation error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Process generation (polling and completion)
   */
  async processGeneration(generationId: string): Promise<WorkflowResult> {
    try {
      console.log(`Processing generation ${generationId}`);

      // 1. Get job details
      const jobResult =
        await this.durableObjectManager.jobManager.getJobStatus(generationId);
      if (!jobResult.success) {
        return { success: false, error: "Generation not found" };
      }

      const jobData = jobResult.result as any;
      const operationId = jobData.operationId;

      if (!operationId) {
        return { success: false, error: "No operation ID found" };
      }

      // 2. Poll Veo3 for status
      const statusResult = await this.veo3Service.pollOperation(operationId);
      if (!statusResult.success) {
        return {
          success: false,
          error: statusResult.error || "Status check failed",
        };
      }

      const status = statusResult.data!;

      // 3. Update job progress
      if (this.config.enableProgressTracking && status.progress !== undefined) {
        await this.durableObjectManager.jobManager.updateProgress(
          generationId,
          status.progress
        );
      }

      // 4. Handle different statuses
      switch (status.status) {
        case "pending":
        case "processing":
          // Continue processing
          return { success: true, generationId, operationId };

        case "completed":
          return await this.handleGenerationCompletion(
            generationId,
            operationId,
            status.result!
          );

        case "failed":
          return await this.handleGenerationFailure(
            generationId,
            status.error || "Unknown error"
          );

        case "cancelled":
          return await this.handleGenerationCancellation(generationId);

        default:
          return { success: false, error: `Unknown status: ${status.status}` };
      }
    } catch (error) {
      console.error("Generation processing error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Handle generation completion
   */
  private async handleGenerationCompletion(
    generationId: string,
    operationId: string,
    result: any
  ): Promise<WorkflowResult> {
    try {
      console.log(`Generation completed: ${generationId}`);

      // 1. Download video from Veo3
      const videoResponse = await fetch(result.video_url);
      if (!videoResponse.ok) {
        throw new Error(
          `Failed to download video: ${videoResponse.statusText}`
        );
      }

      const videoData = await videoResponse.arrayBuffer();

      // 2. Upload to R2
      const uploadResult = await this.videoStorage.uploadVideo(
        new File([videoData], `${generationId}.mp4`, { type: "video/mp4" }),
        {
          id: `${generationId}_video`,
          generationId,
          userId: "system", // TODO: Get from job data
          filename: `${generationId}.mp4`,
          contentType: "video/mp4",
          size: videoData.byteLength,
          duration: result.duration,
          resolution: result.resolution,
        }
      );

      if (!uploadResult.success) {
        throw new Error(`Failed to upload video: ${uploadResult.error}`);
      }

      // 3. Generate thumbnail if available
      let thumbnailUrl: string | undefined;
      if (result.thumbnail_url) {
        const thumbnailResponse = await fetch(result.thumbnail_url);
        if (thumbnailResponse.ok) {
          const thumbnailData = await thumbnailResponse.arrayBuffer();
          const thumbnailUpload = await this.videoStorage.uploadVideo(
            new File([thumbnailData], `${generationId}_thumb.jpg`, {
              type: "image/jpeg",
            }),
            {
              id: `${generationId}_thumbnail`,
              generationId,
              userId: "system",
              filename: `${generationId}_thumb.jpg`,
              contentType: "image/jpeg",
              size: thumbnailData.byteLength,
            }
          );
          thumbnailUrl = thumbnailUpload.url;
        }
      }

      // 4. Complete job
      await this.durableObjectManager.jobManager.completeJob(generationId, {
        videoUrl: uploadResult.url,
        thumbnailUrl,
        duration: result.duration,
        resolution: result.resolution,
        fileSize: result.file_size,
        format: result.format,
        operationId,
        completedAt: new Date(),
      });

      // 5. Remove from queue
      await this.durableObjectManager.queueManager.completeJob(generationId);

      console.log(`Generation workflow completed: ${generationId}`);
      return {
        success: true,
        generationId,
        operationId,
        ...(uploadResult.url && { videoUrl: uploadResult.url }),
      };
    } catch (error) {
      console.error("Generation completion error:", error);
      await this.handleGenerationFailure(
        generationId,
        error instanceof Error ? error.message : "Unknown error"
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Handle generation failure
   */
  private async handleGenerationFailure(
    generationId: string,
    error: string
  ): Promise<WorkflowResult> {
    try {
      console.log(`Generation failed: ${generationId} - ${error}`);

      await this.durableObjectManager.jobManager.failJob(generationId, error);

      await this.durableObjectManager.queueManager.failJob(generationId);

      return { success: false, generationId, error };
    } catch (err) {
      console.error("Generation failure handling error:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }

  /**
   * Handle generation cancellation
   */
  private async handleGenerationCancellation(
    generationId: string
  ): Promise<WorkflowResult> {
    try {
      console.log(`Generation cancelled: ${generationId}`);

      await this.durableObjectManager.jobManager.cancelJob(generationId);
      await this.durableObjectManager.queueManager.failJob(generationId);

      return {
        success: false,
        generationId,
        error: "Generation was cancelled",
      };
    } catch (err) {
      console.error("Generation cancellation handling error:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }

  /**
   * Estimate generation cost
   */
  async estimateGenerationCost(
    prompt: string,
    parameters: Record<string, any> = {}
  ): Promise<{
    success: boolean;
    cost?: number;
    currency?: string;
    error?: string;
  }> {
    try {
      const request: Veo3GenerationRequest = {
        prompt,
        model: parameters.model || "veo-3",
        duration: parameters.duration || 5,
        aspect_ratio: parameters.aspect_ratio || "16:9",
        quality: parameters.quality || "standard",
        ...parameters,
      };

      return await this.veo3Service.estimateCost(request);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Cancel generation
   */
  async cancelGeneration(generationId: string): Promise<WorkflowResult> {
    try {
      console.log(`Cancelling generation ${generationId}`);

      // 1. Get job details
      const jobResult =
        await this.durableObjectManager.jobManager.getJobStatus(generationId);
      if (!jobResult.success) {
        return { success: false, error: "Generation not found" };
      }

      const jobData = jobResult.result as any;
      const operationId = jobData.operationId;

      // 2. Cancel in Veo3 if operation exists
      if (operationId) {
        await this.veo3Service.cancelOperation(operationId);
      }

      // 3. Cancel in Durable Objects
      await this.durableObjectManager.jobManager.cancelJob(generationId);
      await this.durableObjectManager.queueManager.failJob(generationId);

      return { success: true, generationId };
    } catch (error) {
      console.error("Generation cancellation error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Generate clarification questions
   */
  private generateClarificationQuestions(
    prompt: string,
    parameters: Record<string, any>
  ): string[] {
    const questions: string[] = [];

    // Check for missing parameters
    if (!parameters.duration) {
      questions.push("How long should the video be? (1-60 seconds)");
    }

    if (!parameters.aspect_ratio) {
      questions.push(
        "What aspect ratio do you prefer? (16:9, 9:16, 1:1, etc.)"
      );
    }

    if (!parameters.quality) {
      questions.push(
        "What quality level do you prefer? (standard, high, ultra)"
      );
    }

    // Check for prompt clarity
    if (prompt.length < 20) {
      questions.push(
        "Could you provide more details about the video you want to create?"
      );
    }

    return questions;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `gen_${timestamp}_${random}`;
  }
}

/**
 * Create generation workflow instance
 */
export function createGenerationWorkflow(
  config: GenerationWorkflowConfig,
  durableObjectManager: DurableObjectManager,
  videoStorage: VideoStorageHelper
): GenerationWorkflow {
  return new GenerationWorkflow(config, durableObjectManager, videoStorage);
}
