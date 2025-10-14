/**
 * Veo3 Service
 *
 * This service handles all interactions with the Veo3 API for video generation.
 * It provides methods for creating video generation requests, polling for status,
 * and retrieving results.
 *
 * Key Features:
 * - Video generation requests
 * - Operation polling
 * - Result retrieval
 * - Error handling and retry logic
 * - Cost estimation
 * - Prompt validation
 */

export interface Veo3GenerationRequest {
  prompt: string;
  model?: string;
  duration?: number;
  aspect_ratio?: string;
  quality?: string;
  seed?: number;
  guidance_scale?: number;
  num_inference_steps?: number;
}

export interface Veo3GenerationResponse {
  operation_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  created_at: string;
  estimated_completion?: string;
  cost?: number;
}

export interface Veo3OperationStatus {
  operation_id: string;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  progress?: number;
  result?: Veo3VideoResult;
  error?: string;
  created_at: string;
  updated_at: string;
  estimated_completion?: string;
}

export interface Veo3VideoResult {
  video_url: string;
  thumbnail_url?: string;
  duration: number;
  resolution: string;
  file_size: number;
  format: string;
  metadata?: Record<string, any>;
}

export interface Veo3Error {
  code: string;
  message: string;
  details?: any;
}

export interface Veo3Config {
  apiKey: string;
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

export class Veo3Service {
  private config: Veo3Config;
  private defaultHeaders: Record<string, string>;

  constructor(config: Veo3Config) {
    this.config = config;
    this.defaultHeaders = {
      "x-goog-api-key": config.apiKey,
      "Content-Type": "application/json",
      "User-Agent": "Nimu-Generation-Worker/1.0.0",
    };
  }

  /**
   * Generate a video using Veo3 API
   */
  async generateVideo(request: Veo3GenerationRequest): Promise<{
    success: boolean;
    data?: Veo3GenerationResponse;
    error?: string;
  }> {
    const requestId = `veo3_gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      console.log("[VEO3_SERVICE] Starting video generation", {
        requestId,
        prompt: request.prompt,
        model: request.model,
        duration: request.duration,
        timestamp: new Date().toISOString(),
      });

      // Validate the request
      const validation = this.validateGenerationRequest(request);
      if (!validation.valid) {
        console.error("[VEO3_SERVICE] Validation failed", {
          requestId,
          error: validation.error,
          timestamp: new Date().toISOString(),
        });
        return {
          success: false,
          error: validation.error || "Validation failed",
        };
      }

      // Prepare the request payload
      const payload = this.prepareGenerationPayload(request);
      console.log("[VEO3_SERVICE] Prepared payload", {
        requestId,
        payload,
        timestamp: new Date().toISOString(),
      });

      // Make the API call
      console.log("[VEO3_SERVICE] Calling Veo3 API", {
        requestId,
        endpoint: "/models/veo-3.0-generate-001:predictLongRunning",
        timestamp: new Date().toISOString(),
      });

      const response = await this.makeApiCall(
        "/models/veo-3.0-generate-001:predictLongRunning",
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      );

      if (!response.success) {
        console.error("[VEO3_SERVICE] API call failed", {
          requestId,
          error: response.error,
          timestamp: new Date().toISOString(),
        });
        return { success: false, error: response.error || "API call failed" };
      }

      const data = response.data as any;
      console.log("[VEO3_SERVICE] Video generation started", {
        requestId,
        operationName: data.name,
        done: data.done,
        metadata: data.metadata,
        timestamp: new Date().toISOString(),
      });

      // Convert to our expected format
      const veo3Response: Veo3GenerationResponse = {
        operation_id: data.name,
        status: data.done ? "completed" : "pending",
        created_at: data.metadata?.createTime || new Date().toISOString(),
        estimated_completion: data.metadata?.estimatedCompletionTime,
      };

      return { success: true, data: veo3Response };
    } catch (error) {
      console.error("[VEO3_SERVICE] Veo3 generation error", {
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
  async pollOperation(
    operationId: string
  ): Promise<{ success: boolean; data?: Veo3OperationStatus; error?: string }> {
    const requestId = `veo3_poll_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      console.log("[VEO3_SERVICE] Polling operation status", {
        requestId,
        operationId,
        timestamp: new Date().toISOString(),
      });

      const response = await this.makeApiCall(`/${operationId}`, {
        method: "GET",
      });

      if (!response.success) {
        console.error("[VEO3_SERVICE] Polling failed", {
          requestId,
          operationId,
          error: response.error,
          timestamp: new Date().toISOString(),
        });
        return { success: false, error: response.error || "API call failed" };
      }

      const data = response.data as any;
      console.log("[VEO3_SERVICE] Operation status raw response", {
        requestId,
        operationId,
        rawData: data,
        timestamp: new Date().toISOString(),
      });

      // Parse the Veo3 API response format
      const isDone = data.done;
      let status: Veo3OperationStatus["status"] = "pending";
      let result: Veo3VideoResult | undefined;
      let error: string | undefined;

      if (isDone) {
        if (data.response?.generateVideoResponse?.generatedSamples?.[0]) {
          status = "completed";
          const videoSample =
            data.response.generateVideoResponse.generatedSamples[0];
          result = {
            video_url: videoSample.video.uri,
            thumbnail_url: videoSample.video.thumbnailUri,
            duration: videoSample.video.duration || 5,
            resolution: videoSample.video.resolution || "1920x1080",
            file_size: videoSample.video.fileSize || 0,
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

      const veo3Status: Veo3OperationStatus = {
        operation_id: operationId,
        status,
        progress: data.metadata?.progress || (isDone ? 100 : 0),
        ...(result && { result }),
        ...(error && { error }),
        created_at: data.metadata?.createTime || new Date().toISOString(),
        updated_at: data.metadata?.updateTime || new Date().toISOString(),
        ...(data.metadata?.estimatedCompletionTime && {
          estimated_completion: data.metadata.estimatedCompletionTime,
        }),
      };

      console.log("[VEO3_SERVICE] Operation status parsed", {
        requestId,
        operationId,
        status: veo3Status.status,
        progress: veo3Status.progress,
        hasResult: !!veo3Status.result,
        timestamp: new Date().toISOString(),
      });

      return { success: true, data: veo3Status };
    } catch (error) {
      console.error("[VEO3_SERVICE] Veo3 polling error", {
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
  async getResult(
    operationId: string
  ): Promise<{ success: boolean; data?: Veo3VideoResult; error?: string }> {
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

      console.log(`Retrieved result for operation ${operationId}`);
      return { success: true, data: status.result };
    } catch (error) {
      console.error(`Veo3 result retrieval error for ${operationId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Cancel an operation
   */
  async cancelOperation(
    operationId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await this.makeApiCall(
        `/v1/operations/${operationId}/cancel`,
        {
          method: "POST",
        }
      );

      if (!response.success) {
        return { success: false, error: response.error || "API call failed" };
      }

      console.log(`Operation ${operationId} cancelled`);
      return { success: true };
    } catch (error) {
      console.error(`Veo3 cancellation error for ${operationId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Validate a generation prompt
   */
  async validatePrompt(prompt: string): Promise<{
    success: boolean;
    valid?: boolean;
    error?: string;
    suggestions?: string[];
  }> {
    // Gemini API doesn't have a separate validation endpoint
    // Just do basic validation here
    if (!prompt || prompt.trim().length === 0) {
      return {
        success: true,
        valid: false,
        suggestions: ["Please provide a non-empty prompt"],
      };
    }

    if (prompt.length > 1000) {
      return {
        success: true,
        valid: false,
        suggestions: [
          "Prompt is too long. Please keep it under 1000 characters.",
        ],
      };
    }

    return { success: true, valid: true };
  }

  /**
   * Estimate generation cost
   */
  async estimateCost(_request: Veo3GenerationRequest): Promise<{
    success: boolean;
    cost?: number;
    currency?: string;
    error?: string;
  }> {
    // Gemini API doesn't have a cost estimation endpoint
    // Return a mock cost for now
    return {
      success: true,
      cost: 0.1, // Mock cost in USD
      currency: "USD",
    };
  }

  /**
   * Get available models
   */
  async getModels(): Promise<{
    success: boolean;
    models?: any[];
    error?: string;
  }> {
    // Return available Veo3 models
    return {
      success: true,
      models: [
        { id: "veo-3.0-generate-001", name: "Veo 3.0 Generate" },
        { id: "veo-3.0-fast-generate-001", name: "Veo 3.0 Fast Generate" },
        { id: "veo-2.0-generate-001", name: "Veo 2.0 Generate" },
      ],
    };
  }

  /**
   * Validate generation request
   */
  private validateGenerationRequest(request: Veo3GenerationRequest): {
    valid: boolean;
    error?: string;
  } {
    if (!request.prompt || typeof request.prompt !== "string") {
      return { valid: false, error: "Prompt is required and must be a string" };
    }

    if (request.prompt.length < 3) {
      return {
        valid: false,
        error: "Prompt must be at least 3 characters long",
      };
    }

    if (request.prompt.length > 5000) {
      return {
        valid: false,
        error: "Prompt must be less than 5000 characters",
      };
    }

    if (request.duration && (request.duration < 1 || request.duration > 60)) {
      return {
        valid: false,
        error: "Duration must be between 1 and 60 seconds",
      };
    }

    if (
      request.guidance_scale &&
      (request.guidance_scale < 1 || request.guidance_scale > 20)
    ) {
      return { valid: false, error: "Guidance scale must be between 1 and 20" };
    }

    if (
      request.num_inference_steps &&
      (request.num_inference_steps < 10 || request.num_inference_steps > 100)
    ) {
      return {
        valid: false,
        error: "Number of inference steps must be between 10 and 100",
      };
    }

    return { valid: true };
  }

  /**
   * Prepare generation payload for Gemini API
   */
  private prepareGenerationPayload(request: Veo3GenerationRequest): any {
    const payload = {
      instances: [
        {
          prompt: request.prompt,
        },
      ],
      parameters: {
        aspectRatio: request.aspect_ratio || "16:9",
        negativePrompt: "cartoon, drawing, low quality",
        ...(request.seed && { seed: request.seed }),
        ...(request.guidance_scale && {
          guidanceScale: request.guidance_scale,
        }),
        ...(request.num_inference_steps && {
          numInferenceSteps: request.num_inference_steps,
        }),
      },
    };

    console.log("[VEO3_SERVICE] Generated payload", {
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

    console.log("[VEO3_SERVICE] Making API call", {
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

        console.log("[VEO3_SERVICE] API call attempt", {
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

        console.log("[VEO3_SERVICE] API response received", {
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
            console.log("[VEO3_SERVICE] Error response body", {
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
            console.error("[VEO3_SERVICE] Failed to read error response", {
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

          console.error("[VEO3_SERVICE] API call failed", {
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
        console.log("[VEO3_SERVICE] Response body", {
          attempt,
          bodyLength: responseText.length,
          bodyPreview: responseText.substring(0, 500),
          timestamp: new Date().toISOString(),
        });

        let data: any;
        try {
          data = JSON.parse(responseText);
        } catch (e) {
          console.error("[VEO3_SERVICE] Failed to parse response JSON", {
            attempt,
            error: e instanceof Error ? e.message : "Unknown error",
            responseText: responseText.substring(0, 1000),
            timestamp: new Date().toISOString(),
          });
          throw new Error("Invalid JSON response from API");
        }

        console.log("[VEO3_SERVICE] API call successful", {
          attempt,
          dataKeys: Object.keys(data),
          timestamp: new Date().toISOString(),
        });

        return { success: true, data };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        console.error("[VEO3_SERVICE] API call attempt failed", {
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
          console.log("[VEO3_SERVICE] Client error, not retrying", {
            attempt,
            error: lastError.message,
            timestamp: new Date().toISOString(),
          });
          break;
        }

        console.warn(
          `Veo3 API call attempt ${attempt} failed:`,
          lastError.message
        );

        // Exponential backoff
        const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
        console.log("[VEO3_SERVICE] Waiting before retry", {
          attempt,
          delay,
          timestamp: new Date().toISOString(),
        });
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    console.error("[VEO3_SERVICE] All API call attempts failed", {
      totalAttempts: this.config.retryAttempts,
      finalError: lastError?.message,
      timestamp: new Date().toISOString(),
    });

    return {
      success: false,
      error: lastError?.message || "API call failed after all retries",
    };
  }

  /**
   * Get service status
   */
  async getStatus(): Promise<{
    success: boolean;
    status?: string;
    error?: string;
  }> {
    // Return service status
    return {
      success: true,
      status: "operational",
    };
  }
}

/**
 * Create Veo3 service instance
 */
export function createVeo3Service(
  apiKey: string,
  baseUrl: string = "https://generativelanguage.googleapis.com/v1beta"
): Veo3Service {
  const config: Veo3Config = {
    apiKey,
    baseUrl,
    timeout: 30000, // 30 seconds
    retryAttempts: 3,
    retryDelay: 1000, // 1 second
  };

  return new Veo3Service(config);
}

/**
 * Default Veo3 configuration
 */
export const DEFAULT_VEO3_CONFIG: Veo3Config = {
  apiKey: "",
  baseUrl: "https://generativelanguage.googleapis.com/v1beta",
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
};
