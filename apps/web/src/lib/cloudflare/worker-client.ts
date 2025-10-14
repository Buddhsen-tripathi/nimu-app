/**
 * Cloudflare Worker Client
 *
 * This client handles all communication with the Cloudflare Worker API,
 * replacing the previous BullMQ integration.
 *
 * Key Features:
 * - HTTP client for Workers communication
 * - Authentication headers
 * - Error handling and retry logic
 * - Request/response logging
 * - Type-safe API calls
 */

import { getCloudflareConfig } from "../config/cloudflare";

export interface WorkerClientConfig {
  baseUrl: string;
  apiKey?: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

export interface WorkerResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
}

export interface GenerationRequest {
  generationId?: string; // ← Add generation ID
  prompt: string;
  parameters?: {
    duration?: number;
    aspect_ratio?: string;
    quality?: string;
    model?: string;
    priority?: number;
    provider?: string;
    type?: string;
    conversationId?: string;
    messageId?: string;
  };
}

export interface GenerationResponse {
  generationId: string;
  queuePosition?: number;
  clarificationRequired?: boolean;
  clarificationQuestions?: string[];
}

export interface ClarificationRequest {
  clarificationResponses: Record<string, any>;
  clarificationQuestions?: Record<string, any>;
}

export interface JobStatusResponse {
  id: string;
  status: string;
  progress?: number;
  result?: any;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export class WorkerClient {
  private config: WorkerClientConfig;
  private defaultHeaders: Record<string, string>;

  constructor(config: WorkerClientConfig) {
    this.config = config;
    this.defaultHeaders = {
      "Content-Type": "application/json",
      "User-Agent": "Nimu-Web-App/1.0.0",
      ...(config.apiKey && { Authorization: `Bearer ${config.apiKey}` }),
    };
  }

  /**
   * Create a new video generation request
   */
  async createGeneration(
    userId: string,
    request: GenerationRequest
  ): Promise<WorkerResponse<GenerationResponse>> {
    try {
      const response = await this.makeRequest("/api/generations", {
        method: "POST",
        body: JSON.stringify({
          userId,
          ...request,
        }),
      });

      return response;
    } catch (error) {
      console.error("Generation creation error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get generation status
   */
  async getGenerationStatus(
    generationId: string
  ): Promise<WorkerResponse<JobStatusResponse>> {
    try {
      const response = await this.makeRequest(
        `/api/generations/${generationId}`,
        {
          method: "GET",
        }
      );

      return response;
    } catch (error) {
      console.error("Generation status error:", error);
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
    clarification: ClarificationRequest
  ): Promise<WorkerResponse> {
    try {
      const response = await this.makeRequest(
        `/api/generations/${generationId}/clarify`,
        {
          method: "POST",
          body: JSON.stringify(clarification),
        }
      );

      return response;
    } catch (error) {
      console.error("Clarification submission error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Confirm generation
   */
  async confirmGeneration(generationId: string): Promise<WorkerResponse> {
    try {
      const response = await this.makeRequest(
        `/api/generations/${generationId}/confirm`,
        {
          method: "POST",
        }
      );

      return response;
    } catch (error) {
      console.error("Generation confirmation error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get job status from queue
   */
  async getJobStatus(
    jobId: string
  ): Promise<WorkerResponse<JobStatusResponse>> {
    try {
      const response = await this.makeRequest(`/api/queue/jobs/${jobId}`, {
        method: "GET",
      });

      return response;
    } catch (error) {
      console.error("Job status error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get video URL from storage
   */
  async getVideoUrl(
    videoId: string,
    options: {
      expiresIn?: number;
      allowDownload?: boolean;
    } = {}
  ): Promise<WorkerResponse<{ url: string; expiresAt?: string }>> {
    try {
      const params = new URLSearchParams();
      if (options.expiresIn)
        params.set("expiresIn", options.expiresIn.toString());
      if (options.allowDownload) params.set("allowDownload", "true");

      const url = `/api/storage/videos/${videoId}${params.toString() ? `?${params.toString()}` : ""}`;

      const response = await this.makeRequest(url, {
        method: "GET",
      });

      return response;
    } catch (error) {
      console.error("Video URL error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Delete video from storage
   */
  async deleteVideo(videoId: string): Promise<WorkerResponse> {
    try {
      const response = await this.makeRequest(
        `/api/storage/videos/${videoId}`,
        {
          method: "DELETE",
        }
      );

      return response;
    } catch (error) {
      console.error("Video deletion error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * List user videos
   */
  async listVideos(userId: string): Promise<WorkerResponse<{ videos: any[] }>> {
    try {
      const response = await this.makeRequest(
        `/api/storage/videos?userId=${userId}`,
        {
          method: "GET",
        }
      );

      return response;
    } catch (error) {
      console.error("Video listing error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<WorkerResponse<any>> {
    try {
      const response = await this.makeRequest("/api/queue/stats", {
        method: "GET",
      });

      return response;
    } catch (error) {
      console.error("Queue stats error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get queue status
   */
  async getQueueStatus(): Promise<WorkerResponse<any>> {
    try {
      const response = await this.makeRequest("/api/queue/status", {
        method: "GET",
      });

      return response;
    } catch (error) {
      console.error("Queue status error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<WorkerResponse<any>> {
    try {
      const response = await this.makeRequest("/health", {
        method: "GET",
      });

      return response;
    } catch (error) {
      console.error("Health check error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Make HTTP request to Worker
   */
  private async makeRequest(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<WorkerResponse> {
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

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            `HTTP ${response.status}: ${data.error || response.statusText}`
          );
        }

        return {
          success: true,
          data,
          status: response.status,
        };
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
          `Worker API call attempt ${attempt} failed:`,
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
}

/**
 * Create Worker client instance
 */
export function createWorkerClient(
  baseUrl?: string,
  apiKey?: string
): WorkerClient {
  const cloudflareConfig = getCloudflareConfig();

  const config: WorkerClientConfig = {
    baseUrl: baseUrl || cloudflareConfig.workerUrl,
    apiKey: apiKey || cloudflareConfig.apiKey,
    timeout: cloudflareConfig.timeout,
    retryAttempts: cloudflareConfig.retryAttempts,
    retryDelay: cloudflareConfig.retryDelay,
  };

  return new WorkerClient(config);
}

/**
 * Default Worker client configuration
 */
export const DEFAULT_WORKER_CONFIG: WorkerClientConfig = {
  baseUrl: "",
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
};
