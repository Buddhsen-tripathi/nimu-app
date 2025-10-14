/**
 * Google Provider
 *
 * Implementation of VideoGenerationProvider for Google's Gemini API
 * Supports Veo 2.0, Veo 3.0, and future Google video models
 */

import {
  VideoGenerationProvider,
  type VideoModel,
  type GenerationRequest,
  type GenerationResponse,
  type OperationStatus,
  type VideoResult,
} from "./types";
import { modelRegistry } from "./ModelRegistry";

export interface GoogleConfig {
  apiKey: string;
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

export interface GoogleGenerationRequest {
  prompt: string;
  model?: string;
  duration?: number;
  aspect_ratio?: string;
  quality?: string;
  seed?: number;
  guidance_scale?: number;
  num_inference_steps?: number;
  negative_prompt?: string;
}

export interface GoogleGenerationResponse {
  operation_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  created_at: string;
  estimated_completion?: string;
  cost?: number;
}

export interface GoogleOperationStatus {
  operation_id: string;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  progress?: number;
  result?: GoogleVideoResult;
  error?: string;
  created_at: string;
  updated_at: string;
  estimated_completion?: string;
}

export interface GoogleVideoResult {
  video_url: string;
  thumbnail_url?: string;
  duration: number;
  resolution: string;
  file_size: number;
  format: string;
  metadata?: Record<string, any>;
}

export class GoogleProvider extends VideoGenerationProvider {
  public readonly providerId = "google";
  public readonly providerName = "Google Gemini";

  private config: GoogleConfig;
  private defaultHeaders: Record<string, string>;

  constructor(config: GoogleConfig) {
    super();
    this.config = config;
    this.defaultHeaders = {
      "x-goog-api-key": config.apiKey,
      "Content-Type": "application/json",
      "User-Agent": "Nimu-Generation-Worker/1.0.0",
    };
  }

  /**
   * Get available Google models
   */
  async getAvailableModels(): Promise<VideoModel[]> {
    return modelRegistry.getModelsByProvider("google");
  }

  /**
   * Validate generation request
   */
  async validateRequest(request: GenerationRequest): Promise<{
    valid: boolean;
    error?: string;
    suggestions?: string[];
  }> {
    const model = modelRegistry.getModel(request.model);

    if (!model) {
      return {
        valid: false,
        error: `Model ${request.model} not found`,
        suggestions: ["Use veo-3.0-generate-001 or veo-2.0-generate-001"],
      };
    }

    if (!model.isAvailable) {
      return {
        valid: false,
        error: `Model ${request.model} is not available`,
        suggestions: ["Try veo-3.0-generate-001 instead"],
      };
    }

    // Validate prompt
    if (!request.prompt || request.prompt.trim().length === 0) {
      return {
        valid: false,
        error: "Prompt is required",
        suggestions: ["Please provide a non-empty prompt"],
      };
    }

    if (request.prompt.length < 3) {
      return {
        valid: false,
        error: "Prompt must be at least 3 characters long",
        suggestions: ["Please provide a more detailed prompt"],
      };
    }

    if (request.prompt.length > 5000) {
      return {
        valid: false,
        error: "Prompt must be less than 5000 characters",
        suggestions: ["Please shorten your prompt"],
      };
    }

    // Validate duration
    const duration = request.parameters.duration;
    if (
      duration &&
      (duration < 1 || duration > model.capabilities.maxDuration)
    ) {
      return {
        valid: false,
        error: `Duration must be between 1 and ${model.capabilities.maxDuration} seconds for ${model.name}`,
        suggestions: [
          `Set duration between 1-${model.capabilities.maxDuration} seconds`,
        ],
      };
    }

    // Validate aspect ratio
    const aspectRatio = request.parameters.aspect_ratio;
    if (
      aspectRatio &&
      !model.capabilities.supportedAspectRatios.includes(aspectRatio)
    ) {
      return {
        valid: false,
        error: `Aspect ratio ${aspectRatio} not supported by ${model.name}`,
        suggestions: [
          `Use one of: ${model.capabilities.supportedAspectRatios.join(", ")}`,
        ],
      };
    }

    // Validate guidance scale
    const guidanceScale = request.parameters.guidance_scale;
    if (guidanceScale && model.parameters.guidanceScale) {
      const { min, max } = model.parameters.guidanceScale;
      if (guidanceScale < min || guidanceScale > max) {
        return {
          valid: false,
          error: `Guidance scale must be between ${min} and ${max}`,
          suggestions: [`Set guidance scale between ${min}-${max}`],
        };
      }
    }

    return { valid: true };
  }

  /**
   * Generate video using Google's API
   */
  async generateVideo(request: GenerationRequest): Promise<GenerationResponse> {
    const requestId = `google_gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      console.log("[GOOGLE_PROVIDER] Starting video generation", {
        requestId,
        model: request.model,
        prompt: request.prompt,
        parameters: request.parameters,
        timestamp: new Date().toISOString(),
      });

      // Validate the request
      const validation = await this.validateRequest(request);
      if (!validation.valid) {
        console.error("[GOOGLE_PROVIDER] Validation failed", {
          requestId,
          error: validation.error,
          timestamp: new Date().toISOString(),
        });
        return {
          success: false,
          error: validation.error || "Validation failed",
        };
      }

      // Get model info
      const model = modelRegistry.getModel(request.model)!;

      // Prepare the request payload
      const payload = this.prepareGenerationPayload(request, model);
      console.log("[GOOGLE_PROVIDER] Prepared payload", {
        requestId,
        payload,
        timestamp: new Date().toISOString(),
      });

      // Make the API call
      const endpoint = `/models/${request.model}:predictLongRunning`;
      console.log("[GOOGLE_PROVIDER] Calling Google API", {
        requestId,
        endpoint,
        timestamp: new Date().toISOString(),
      });

      const response = await this.makeApiCall(endpoint, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!response.success) {
        console.error("[GOOGLE_PROVIDER] API call failed", {
          requestId,
          error: response.error,
          timestamp: new Date().toISOString(),
        });
        return { success: false, error: response.error || "API call failed" };
      }

      const data = response.data as any;
      console.log("[GOOGLE_PROVIDER] Video generation started", {
        requestId,
        operationName: data.name,
        done: data.done,
        metadata: data.metadata,
        timestamp: new Date().toISOString(),
      });

      // Convert to our expected format
      const generationResponse: GenerationResponse = {
        success: true,
        operationId: data.name,
        status: data.done ? "completed" : "pending",
        estimatedCompletion: data.metadata?.estimatedCompletionTime,
      };

      return generationResponse;
    } catch (error) {
      console.error("[GOOGLE_PROVIDER] Generation error", {
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
   * Poll for operation status
   */
  async pollOperation(operationId: string): Promise<{
    success: boolean;
    data?: OperationStatus;
    error?: string;
  }> {
    const requestId = `google_poll_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      console.log("[GOOGLE_PROVIDER] Polling operation status", {
        requestId,
        operationId,
        timestamp: new Date().toISOString(),
      });

      const response = await this.makeApiCall(`/${operationId}`, {
        method: "GET",
      });

      if (!response.success) {
        console.error("[GOOGLE_PROVIDER] Polling failed", {
          requestId,
          operationId,
          error: response.error,
          timestamp: new Date().toISOString(),
        });
        return { success: false, error: response.error || "API call failed" };
      }

      const data = response.data as any;
      console.log("[GOOGLE_PROVIDER] Operation status raw response", {
        requestId,
        operationId,
        rawData: data,
        timestamp: new Date().toISOString(),
      });

      // Parse the Google API response format
      const isDone = data.done;
      let status: OperationStatus["status"] = "pending";
      let result: VideoResult | undefined;
      let error: string | undefined;

      if (isDone) {
        if (data.response?.generateVideoResponse?.generatedSamples?.[0]) {
          status = "completed";
          const videoSample =
            data.response.generateVideoResponse.generatedSamples[0];
          result = {
            videoUrl: videoSample.video.uri,
            thumbnailUrl: videoSample.video.thumbnailUri,
            duration: videoSample.video.duration || 5,
            resolution: videoSample.video.resolution || "1920x1080",
            fileSize: videoSample.video.fileSize || 0,
            format: "mp4",
            metadata: videoSample.video,
          };
        } else if (data.error) {
          status = "failed";
          error = data.error.message || "Unknown error";
        } else {
          status = "completed";
        }
      } else {
        status = "processing";
      }

      const operationStatus: OperationStatus = {
        operationId,
        status,
        progress: data.metadata?.progress || (isDone ? 100 : 0),
        ...(result && { result }),
        ...(error && { error }),
        createdAt: data.metadata?.createTime || new Date().toISOString(),
        updatedAt: data.metadata?.updateTime || new Date().toISOString(),
        ...(data.metadata?.estimatedCompletionTime && {
          estimatedCompletion: data.metadata.estimatedCompletionTime,
        }),
      };

      console.log("[GOOGLE_PROVIDER] Operation status parsed", {
        requestId,
        operationId,
        status: operationStatus.status,
        progress: operationStatus.progress,
        hasResult: !!operationStatus.result,
        timestamp: new Date().toISOString(),
      });

      return { success: true, data: operationStatus };
    } catch (error) {
      console.error("[GOOGLE_PROVIDER] Polling error", {
        requestId,
        operationId,
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
   * Get operation result
   */
  async getResult(operationId: string): Promise<{
    success: boolean;
    data?: VideoResult;
    error?: string;
  }> {
    try {
      const statusResponse = await this.pollOperation(operationId);

      if (!statusResponse.success) {
        return {
          success: false,
          error: statusResponse.error || "Status check failed",
        };
      }

      const status = statusResponse.data!;

      if (status.status !== "completed") {
        return {
          success: false,
          error: `Operation ${operationId} is not completed. Status: ${status.status}`,
        };
      }

      if (!status.result) {
        return {
          success: false,
          error: `No result found for operation ${operationId}`,
        };
      }

      console.log(
        `[GOOGLE_PROVIDER] Retrieved result for operation ${operationId}`
      );
      return { success: true, data: status.result };
    } catch (error) {
      console.error(
        `[GOOGLE_PROVIDER] Result retrieval error for ${operationId}:`,
        error
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Cancel an operation
   */
  async cancelOperation(operationId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const response = await this.makeApiCall(`/${operationId}:cancel`, {
        method: "POST",
      });

      if (!response.success) {
        return { success: false, error: response.error || "API call failed" };
      }

      console.log(`[GOOGLE_PROVIDER] Operation ${operationId} cancelled`);
      return { success: true };
    } catch (error) {
      console.error(
        `[GOOGLE_PROVIDER] Cancellation error for ${operationId}:`,
        error
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Estimate generation cost
   */
  async estimateCost(request: GenerationRequest): Promise<{
    success: boolean;
    cost?: number;
    currency?: string;
    error?: string;
  }> {
    try {
      const model = modelRegistry.getModel(request.model);
      if (!model || !model.pricing) {
        return {
          success: true,
          cost: 0.1, // Default fallback cost
          currency: "USD",
        };
      }

      const duration =
        request.parameters.duration || model.parameters.duration.default;
      const cost = model.pricing.costPerSecond * duration;

      return {
        success: true,
        cost,
        currency: model.pricing.currency,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get service status
   */
  async getStatus(): Promise<{
    success: boolean;
    status?: string;
    error?: string;
  }> {
    return {
      success: true,
      status: "operational",
    };
  }

  /**
   * Prepare generation payload for Google API
   */
  private prepareGenerationPayload(
    request: GenerationRequest,
    model: VideoModel
  ): any {
    const payload = {
      instances: [
        {
          prompt: request.prompt,
        },
      ],
      parameters: {
        aspectRatio:
          request.parameters.aspect_ratio ||
          model.parameters.aspectRatio.default,
        negativePrompt:
          request.parameters.negative_prompt || "cartoon, drawing, low quality",
        ...(request.parameters.seed && { seed: request.parameters.seed }),
        ...(request.parameters.guidance_scale && {
          guidanceScale: request.parameters.guidance_scale,
        }),
        ...(request.parameters.num_inference_steps && {
          numInferenceSteps: request.parameters.num_inference_steps,
        }),
      },
    };

    console.log("[GOOGLE_PROVIDER] Generated payload", {
      payload,
      timestamp: new Date().toISOString(),
    });

    return payload;
  }

  /**
   * Make API call with retry logic
   */
  private async makeApiCall(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const url = `${this.config.baseUrl}${endpoint}`;
    let lastError: Error | null = null;

    console.log("[GOOGLE_PROVIDER] Making API call", {
      url,
      endpoint,
      method: options.method || "GET",
      hasBody: !!options.body,
      headers: this.defaultHeaders,
      timestamp: new Date().toISOString(),
    });

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          this.config.timeout
        );

        console.log("[GOOGLE_PROVIDER] API call attempt", {
          attempt,
          url,
          method: options.method || "GET",
          timestamp: new Date().toISOString(),
        });

        const response = await fetch(url, {
          ...options,
          headers: {
            ...this.defaultHeaders,
            ...options.headers,
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        console.log("[GOOGLE_PROVIDER] API response received", {
          attempt,
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          timestamp: new Date().toISOString(),
        });

        if (!response.ok) {
          let errorData: any = {};
          let errorText = "";

          try {
            const responseText = await response.text();
            console.log("[GOOGLE_PROVIDER] Error response body", {
              attempt,
              status: response.status,
              body: responseText,
              timestamp: new Date().toISOString(),
            });

            try {
              errorData = JSON.parse(responseText);
            } catch {
              errorText = responseText;
            }
          } catch (e) {
            console.error("[GOOGLE_PROVIDER] Failed to read error response", {
              attempt,
              error: e instanceof Error ? e.message : "Unknown error",
              timestamp: new Date().toISOString(),
            });
          }

          const errorMessage =
            errorData.error?.message ||
            errorData.message ||
            errorText ||
            response.statusText;

          console.error("[GOOGLE_PROVIDER] API call failed", {
            attempt,
            status: response.status,
            statusText: response.statusText,
            errorMessage,
            errorData,
            timestamp: new Date().toISOString(),
          });

          throw new Error(`HTTP ${response.status}: ${errorMessage}`);
        }

        const responseText = await response.text();
        console.log("[GOOGLE_PROVIDER] Response body", {
          attempt,
          bodyLength: responseText.length,
          bodyPreview: responseText.substring(0, 500),
          timestamp: new Date().toISOString(),
        });

        let data: any;
        try {
          data = JSON.parse(responseText);
        } catch (e) {
          console.error("[GOOGLE_PROVIDER] Failed to parse response JSON", {
            attempt,
            error: e instanceof Error ? e.message : "Unknown error",
            responseText: responseText.substring(0, 1000),
            timestamp: new Date().toISOString(),
          });
          throw new Error("Invalid JSON response from API");
        }

        console.log("[GOOGLE_PROVIDER] API call successful", {
          attempt,
          dataKeys: Object.keys(data),
          timestamp: new Date().toISOString(),
        });

        return { success: true, data };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        console.error("[GOOGLE_PROVIDER] API call attempt failed", {
          attempt,
          error: lastError.message,
          stack: lastError.stack,
          timestamp: new Date().toISOString(),
        });

        if (attempt === this.config.retryAttempts) {
          break;
        }

        // Don't retry on client errors (4xx)
        if (error instanceof Error && error.message.includes("HTTP 4")) {
          console.log("[GOOGLE_PROVIDER] Client error, not retrying", {
            attempt,
            error: lastError.message,
            timestamp: new Date().toISOString(),
          });
          break;
        }

        console.warn(
          `[GOOGLE_PROVIDER] API call attempt ${attempt} failed:`,
          lastError.message
        );

        // Exponential backoff
        const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
        console.log("[GOOGLE_PROVIDER] Waiting before retry", {
          attempt,
          delay,
          timestamp: new Date().toISOString(),
        });
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    console.error("[GOOGLE_PROVIDER] All API call attempts failed", {
      totalAttempts: this.config.retryAttempts,
      finalError: lastError?.message,
      timestamp: new Date().toISOString(),
    });

    return {
      success: false,
      error: lastError?.message || "API call failed after all retries",
    };
  }
}

/**
 * Create Google provider instance
 */
export function createGoogleProvider(
  apiKey: string,
  baseUrl: string = "https://generativelanguage.googleapis.com/v1beta"
): GoogleProvider {
  const config: GoogleConfig = {
    apiKey,
    baseUrl,
    timeout: 30000, // 30 seconds
    retryAttempts: 3,
    retryDelay: 1000, // 1 second
  };

  return new GoogleProvider(config);
}

/**
 * Default Google configuration
 */
export const DEFAULT_GOOGLE_CONFIG: GoogleConfig = {
  apiKey: "",
  baseUrl: "https://generativelanguage.googleapis.com/v1beta",
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
};
