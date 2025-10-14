/**
 * Provider Types and Interfaces
 *
 * This file defines the core types and interfaces for the video generation
 * provider system, enabling support for multiple AI providers.
 */

export interface VideoModel {
  id: string;
  name: string;
  provider: string;
  description: string;
  capabilities: ModelCapabilities;
  parameters: ModelParameters;
  pricing?: ModelPricing;
  isAvailable: boolean;
  isBeta?: boolean;
}

export interface ModelCapabilities {
  maxDuration: number; // in seconds
  supportedAspectRatios: string[];
  supportedResolutions: string[];
  supportedFormats: string[];
  supportsAudio: boolean;
  supportsImageInput: boolean;
  supportsNegativePrompt: boolean;
}

export interface ModelParameters {
  duration: {
    min: number;
    max: number;
    default: number;
  };
  aspectRatio: {
    options: string[];
    default: string;
  };
  quality: {
    options: string[];
    default: string;
  };
  guidanceScale?: {
    min: number;
    max: number;
    default: number;
  };
  inferenceSteps?: {
    min: number;
    max: number;
    default: number;
  };
}

export interface ModelPricing {
  costPerSecond: number;
  currency: string;
  tier: "free" | "standard" | "premium";
}

export interface GenerationRequest {
  prompt: string;
  model: string;
  provider: string;
  parameters: Record<string, any>;
  userId: string;
  conversationId: string;
  messageId: string;
}

export interface GenerationResponse {
  success: boolean;
  operationId?: string;
  status?: "pending" | "processing" | "completed" | "failed";
  error?: string;
  estimatedCompletion?: string;
  cost?: number;
}

export interface VideoResult {
  videoUrl: string;
  thumbnailUrl?: string;
  duration: number;
  resolution: string;
  fileSize: number;
  format: string;
  metadata?: Record<string, any>;
}

export interface OperationStatus {
  operationId: string;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  progress?: number;
  result?: VideoResult;
  error?: string;
  createdAt: string;
  updatedAt: string;
  estimatedCompletion?: string;
}

/**
 * Base interface for video generation providers
 */
export abstract class VideoGenerationProvider {
  abstract readonly providerId: string;
  abstract readonly providerName: string;

  /**
   * Get available models for this provider
   */
  abstract getAvailableModels(): Promise<VideoModel[]>;

  /**
   * Validate a generation request
   */
  abstract validateRequest(request: GenerationRequest): Promise<{
    valid: boolean;
    error?: string;
    suggestions?: string[];
  }>;

  /**
   * Start video generation
   */
  abstract generateVideo(
    request: GenerationRequest
  ): Promise<GenerationResponse>;

  /**
   * Poll operation status
   */
  abstract pollOperation(operationId: string): Promise<{
    success: boolean;
    data?: OperationStatus;
    error?: string;
  }>;

  /**
   * Get generation result
   */
  abstract getResult(operationId: string): Promise<{
    success: boolean;
    data?: VideoResult;
    error?: string;
  }>;

  /**
   * Cancel operation
   */
  abstract cancelOperation(operationId: string): Promise<{
    success: boolean;
    error?: string;
  }>;

  /**
   * Estimate generation cost
   */
  abstract estimateCost(request: GenerationRequest): Promise<{
    success: boolean;
    cost?: number;
    currency?: string;
    error?: string;
  }>;

  /**
   * Get provider status
   */
  abstract getStatus(): Promise<{
    success: boolean;
    status?: string;
    error?: string;
  }>;
}

export type ProviderType =
  | "google"
  | "runway"
  | "pika"
  | "stable_video"
  | "elevenlabs"
  | "murf"
  | "synthesia";
