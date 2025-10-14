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

import { DurableObjectManager } from "../utils/durable-objects";
import { VideoStorageHelper } from "../utils/r2";
import {
  type GenerationRequest,
  modelRegistry,
  ProviderFactory,
  type ProviderConfig,
} from "./providers";

export interface GenerationWorkflowConfig {
  providers: ProviderConfig;
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
  private providerFactory: ProviderFactory;
  private durableObjectManager: DurableObjectManager;
  private videoStorage: VideoStorageHelper;
  private config: GenerationWorkflowConfig;

  constructor(
    config: GenerationWorkflowConfig,
    durableObjectManager: DurableObjectManager,
    videoStorage: VideoStorageHelper
  ) {
    this.config = config;
    this.providerFactory = ProviderFactory.getInstance(config.providers);
    this.durableObjectManager = durableObjectManager;
    this.videoStorage = videoStorage;
  }

  /**
   * Start a new generation workflow
   */
  async startGeneration(
    userId: string,
    prompt: string,
    parameters: Record<string, any> = {},
    selectedModel?: string
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

      // 1. Determine model to use
      const model = selectedModel
        ? modelRegistry.getModel(selectedModel)
        : modelRegistry.getDefaultModel();

      if (!model) {
        console.error("[GENERATION_WORKFLOW] No model available", {
          requestId,
          selectedModel,
          timestamp: new Date().toISOString(),
        });
        return {
          success: false,
          error: "No video generation model available",
        };
      }

      console.log("[GENERATION_WORKFLOW] Using model", {
        requestId,
        modelId: model.id,
        modelName: model.name,
        provider: model.provider,
        timestamp: new Date().toISOString(),
      });

      // 2. Get provider for the model
      const provider = this.providerFactory.getProviderForModel(model.id);

      // 3. Create generation request
      // Filter out old format fields that might be in parameters
      const {
        model: oldModel,
        provider: oldProvider,
        ...cleanParameters
      } = parameters;

      const generationRequest: GenerationRequest = {
        prompt,
        model: model.id,
        provider: model.provider,
        parameters: {
          duration:
            cleanParameters.duration || model.parameters.duration.default,
          aspect_ratio:
            cleanParameters.aspect_ratio ||
            model.parameters.aspectRatio.default,
          quality: cleanParameters.quality || model.parameters.quality.default,
          ...cleanParameters,
        },
        userId,
        conversationId: "", // Will be set later
        messageId: "", // Will be set later
      };

      // 4. Validate the request
      console.log("[GENERATION_WORKFLOW] Validating request", {
        requestId,
        model: generationRequest.model,
        prompt: generationRequest.prompt,
        timestamp: new Date().toISOString(),
      });

      const validation = await provider.validateRequest(generationRequest);
      if (!validation.valid) {
        console.error("[GENERATION_WORKFLOW] Validation failed", {
          requestId,
          error: validation.error,
          timestamp: new Date().toISOString(),
        });
        return {
          success: false,
          error: validation.error || "Validation failed",
          clarificationRequired: true,
          clarificationQuestions: validation.suggestions || [],
        };
      }

      // 5. Estimate cost
      console.log("[GENERATION_WORKFLOW] Estimating cost", {
        requestId,
        model: generationRequest.model,
        parameters: generationRequest.parameters,
        timestamp: new Date().toISOString(),
      });

      const costEstimate = await provider.estimateCost(generationRequest);
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

      // 6. Create job in JobManager
      const generationId = this.generateId();
      console.log("[GENERATION_WORKFLOW] Creating job", {
        requestId,
        generationId,
        userId,
        model: model.id,
        timestamp: new Date().toISOString(),
      });

      const jobResult = await this.durableObjectManager.createAndQueueJob({
        id: generationId,
        generationId,
        userId,
        prompt,
        parameters: generationRequest.parameters,
        provider: model.provider,
        model: model.id,
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

      // 7. Update job status to pending
      await this.durableObjectManager.jobManager.updateJobStatus(
        generationId,
        "pending_clarification",
        {
          costEstimate: costEstimate.cost,
          model: model.id,
          provider: model.provider,
        }
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

      // 2. Prepare generation request
      const actualJobData = jobData.jobState?.data || jobData;
      const model = modelRegistry.getModel(actualJobData.model);

      if (!model) {
        return {
          success: false,
          error: `Model ${actualJobData.model} not found`,
        };
      }

      const provider = this.providerFactory.getProviderForModel(model.id);

      const generationRequest: GenerationRequest = {
        prompt: actualJobData.prompt,
        model: actualJobData.model,
        provider: model.provider,
        parameters: {
          duration:
            actualJobData.parameters?.duration ||
            model.parameters.duration.default,
          aspect_ratio:
            actualJobData.parameters?.aspect_ratio ||
            model.parameters.aspectRatio.default,
          quality:
            actualJobData.parameters?.quality ||
            model.parameters.quality.default,
          ...actualJobData.parameters,
        },
        userId: actualJobData.userId,
        conversationId: actualJobData.conversationId || "",
        messageId: actualJobData.messageId || "",
      };

      // 3. Start generation
      const generationResult = await provider.generateVideo(generationRequest);
      if (!generationResult.success) {
        return {
          success: false,
          error: generationResult.error || "Generation failed",
        };
      }

      const operationId = generationResult.operationId!;

      // 4. Update job with operation ID
      console.log("[DEBUG] Updating job status with operationId:", operationId);
      const updateResult =
        await this.durableObjectManager.jobManager.updateJobStatus(
          generationId,
          "active",
          {
            operationId,
            status: generationResult.status,
            startedAt: new Date(),
          }
        );
      console.log("[DEBUG] Update job status result:", updateResult);

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

      // Debug logging
      console.log(
        "[DEBUG] Job data structure:",
        JSON.stringify(jobData, null, 2)
      );
      console.log("[DEBUG] Looking for operationId in:");
      console.log(
        "  - jobData.jobState?.operationId:",
        jobData.jobState?.operationId
      );
      console.log(
        "  - jobData.jobState?.data?.operationId:",
        jobData.jobState?.data?.operationId
      );
      console.log("  - jobData.operationId:", jobData.operationId);

      const operationId =
        jobData.jobState?.operationId ||
        jobData.jobState?.data?.operationId ||
        jobData.operationId;
      const modelId =
        jobData.jobState?.model ||
        jobData.jobState?.data?.model ||
        jobData.model;

      if (!operationId) {
        console.log("[DEBUG] No operation ID found in any location");
        return { success: false, error: "No operation ID found" };
      }

      console.log("[DEBUG] Found operationId:", operationId);

      if (!modelId) {
        return { success: false, error: "No model ID found" };
      }

      // 2. Get provider and poll for status
      const provider = this.providerFactory.getProviderForModel(modelId);
      const statusResult = await provider.pollOperation(operationId);
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

      // 1. Extract video URL from Google API response
      const videoUrl =
        result.response?.generateVideoResponse?.generatedSamples?.[0]?.video
          ?.uri;
      if (!videoUrl) {
        throw new Error("No video URL found in generation result");
      }

      console.log(`Downloading video from: ${videoUrl}`);

      // 2. Download video from Google
      const videoResponse = await fetch(videoUrl);
      if (!videoResponse.ok) {
        throw new Error(
          `Failed to download video: ${videoResponse.statusText}`
        );
      }

      const videoData = await videoResponse.arrayBuffer();

      // 3. Upload to R2
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
    parameters: Record<string, any> = {},
    modelId?: string
  ): Promise<{
    success: boolean;
    cost?: number;
    currency?: string;
    error?: string;
  }> {
    try {
      const model = modelId
        ? modelRegistry.getModel(modelId)
        : modelRegistry.getDefaultModel();

      if (!model) {
        return {
          success: false,
          error: "No model available for cost estimation",
        };
      }

      const provider = this.providerFactory.getProviderForModel(model.id);

      const request: GenerationRequest = {
        prompt,
        model: model.id,
        provider: model.provider,
        parameters: {
          duration: parameters.duration || model.parameters.duration.default,
          aspect_ratio:
            parameters.aspect_ratio || model.parameters.aspectRatio.default,
          quality: parameters.quality || model.parameters.quality.default,
          ...parameters,
        },
        userId: "",
        conversationId: "",
        messageId: "",
      };

      return await provider.estimateCost(request);
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
      const operationId =
        jobData.jobState?.operationId ||
        jobData.jobState?.data?.operationId ||
        jobData.operationId;
      const modelId =
        jobData.jobState?.model ||
        jobData.jobState?.data?.model ||
        jobData.model;

      // 2. Cancel with provider if operation exists
      if (operationId && modelId) {
        const provider = this.providerFactory.getProviderForModel(modelId);
        await provider.cancelOperation(operationId);
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
