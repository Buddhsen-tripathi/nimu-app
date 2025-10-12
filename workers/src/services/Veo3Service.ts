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
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
      "User-Agent": "Nimu-Generation-Worker/1.0.0",
    };
  }

  /**
   * Generate a video using Veo3 API
   */
  async generateVideo(
    request: Veo3GenerationRequest
  ): Promise<{
    success: boolean;
    data?: Veo3GenerationResponse;
    error?: string;
  }> {
    try {
      // Validate the request
      const validation = this.validateGenerationRequest(request);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error || "Validation failed",
        };
      }

      // Prepare the request payload
      const payload = this.prepareGenerationPayload(request);

      // Make the API call
      const response = await this.makeApiCall("/v1/generations", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!response.success) {
        return { success: false, error: response.error || "API call failed" };
      }

      const data = response.data as Veo3GenerationResponse;
      console.log(`Video generation started: ${data.operation_id}`);

      return { success: true, data };
    } catch (error) {
      console.error("Veo3 generation error:", error);
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
    try {
      const response = await this.makeApiCall(`/v1/operations/${operationId}`, {
        method: "GET",
      });

      if (!response.success) {
        return { success: false, error: response.error || "API call failed" };
      }

      const data = response.data as Veo3OperationStatus;
      console.log(`Operation ${operationId} status: ${data.status}`);

      return { success: true, data };
    } catch (error) {
      console.error(`Veo3 polling error for ${operationId}:`, error);
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
  async validatePrompt(
    prompt: string
  ): Promise<{
    success: boolean;
    valid?: boolean;
    error?: string;
    suggestions?: string[];
  }> {
    try {
      const response = await this.makeApiCall("/v1/validate-prompt", {
        method: "POST",
        body: JSON.stringify({ prompt }),
      });

      if (!response.success) {
        return { success: false, error: response.error || "API call failed" };
      }

      const data = response.data as { valid: boolean; suggestions?: string[] };
      return { success: true, ...data };
    } catch (error) {
      console.error("Veo3 prompt validation error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Estimate generation cost
   */
  async estimateCost(
    request: Veo3GenerationRequest
  ): Promise<{
    success: boolean;
    cost?: number;
    currency?: string;
    error?: string;
  }> {
    try {
      const payload = this.prepareGenerationPayload(request);

      const response = await this.makeApiCall("/v1/estimate-cost", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!response.success) {
        return { success: false, error: response.error || "API call failed" };
      }

      const data = response.data as { cost: number; currency: string };
      return { success: true, ...data };
    } catch (error) {
      console.error("Veo3 cost estimation error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get available models
   */
  async getModels(): Promise<{
    success: boolean;
    models?: any[];
    error?: string;
  }> {
    try {
      const response = await this.makeApiCall("/v1/models", {
        method: "GET",
      });

      if (!response.success) {
        return { success: false, error: response.error || "API call failed" };
      }

      const data = response.data as { models: any[] };
      return { success: true, ...data };
    } catch (error) {
      console.error("Veo3 models error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
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
   * Prepare generation payload
   */
  private prepareGenerationPayload(request: Veo3GenerationRequest): any {
    return {
      prompt: request.prompt,
      model: request.model || "veo-3",
      duration: request.duration || 5,
      aspect_ratio: request.aspect_ratio || "16:9",
      quality: request.quality || "standard",
      ...(request.seed && { seed: request.seed }),
      ...(request.guidance_scale && { guidance_scale: request.guidance_scale }),
      ...(request.num_inference_steps && {
        num_inference_steps: request.num_inference_steps,
      }),
    };
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

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          this.config.timeout
        );

        const response = await fetch(url, {
          ...options,
          headers: {
            ...this.defaultHeaders,
            ...options.headers,
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = (await response.json().catch(() => ({}))) as any;
          throw new Error(
            `HTTP ${response.status}: ${errorData.message || response.statusText}`
          );
        }

        const data = await response.json();
        return { success: true, data };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt === this.config.retryAttempts) {
          break;
        }

        // Don't retry on client errors (4xx)
        if (error instanceof Error && error.message.includes("HTTP 4")) {
          break;
        }

        console.warn(
          `Veo3 API call attempt ${attempt} failed:`,
          lastError.message
        );

        // Exponential backoff
        const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

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
    try {
      const response = await this.makeApiCall("/v1/status", {
        method: "GET",
      });

      if (!response.success) {
        return { success: false, error: response.error || "API call failed" };
      }

      const data = response.data as { status: string };
      return { success: true, ...data };
    } catch (error) {
      console.error("Veo3 status error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

/**
 * Create Veo3 service instance
 */
export function createVeo3Service(
  apiKey: string,
  baseUrl: string = "https://api.veo3.com"
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
  baseUrl: "https://api.veo3.com",
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
};
