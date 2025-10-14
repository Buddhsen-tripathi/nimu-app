/**
 * Model Registry
 *
 * Centralized registry for all available video generation models.
 * Provides model discovery, validation, and configuration management.
 */

import {
  type VideoModel,
  type ModelCapabilities,
  type ModelParameters,
} from "./types";

export class ModelRegistry {
  private static instance: ModelRegistry;
  private models: Map<string, VideoModel> = new Map();
  private providerModels: Map<string, VideoModel[]> = new Map();

  private constructor() {
    this.initializeGoogleModels();
  }

  public static getInstance(): ModelRegistry {
    if (!ModelRegistry.instance) {
      ModelRegistry.instance = new ModelRegistry();
    }
    return ModelRegistry.instance;
  }

  /**
   * Initialize Google/Gemini video models
   */
  private initializeGoogleModels(): void {
    const googleModels: VideoModel[] = [
      {
        id: "veo-3.0-generate-001",
        name: "Veo 3.0 Generate",
        provider: "google",
        description:
          "Latest Veo model with enhanced quality and 8-second video generation with native audio",
        capabilities: {
          maxDuration: 8,
          supportedAspectRatios: ["16:9", "9:16", "1:1", "4:3", "3:4"],
          supportedResolutions: ["720p", "1080p"],
          supportedFormats: ["mp4"],
          supportsAudio: true,
          supportsImageInput: true,
          supportsNegativePrompt: true,
        },
        parameters: {
          duration: { min: 1, max: 8, default: 5 },
          aspectRatio: {
            options: ["16:9", "9:16", "1:1", "4:3", "3:4"],
            default: "16:9",
          },
          quality: {
            options: ["standard", "high"],
            default: "standard",
          },
          guidanceScale: { min: 1, max: 20, default: 7 },
          inferenceSteps: { min: 10, max: 100, default: 50 },
        },
        pricing: {
          costPerSecond: 0.125, // $0.125 per second
          currency: "USD",
          tier: "premium",
        },
        isAvailable: true,
        isBeta: false,
      },
      {
        id: "veo-3.0-fast-generate-001",
        name: "Veo 3.0 Fast Generate",
        provider: "google",
        description: "Faster version of Veo 3.0 with reduced generation time",
        capabilities: {
          maxDuration: 8,
          supportedAspectRatios: ["16:9", "9:16", "1:1"],
          supportedResolutions: ["720p", "1080p"],
          supportedFormats: ["mp4"],
          supportsAudio: true,
          supportsImageInput: true,
          supportsNegativePrompt: true,
        },
        parameters: {
          duration: { min: 1, max: 8, default: 5 },
          aspectRatio: {
            options: ["16:9", "9:16", "1:1"],
            default: "16:9",
          },
          quality: {
            options: ["standard"],
            default: "standard",
          },
        },
        pricing: {
          costPerSecond: 0.1, // $0.10 per second
          currency: "USD",
          tier: "standard",
        },
        isAvailable: true,
        isBeta: false,
      },
      {
        id: "veo-2.0-generate-001",
        name: "Veo 2.0 Generate",
        provider: "google",
        description:
          "Previous generation Veo model, reliable and cost-effective",
        capabilities: {
          maxDuration: 5,
          supportedAspectRatios: ["16:9", "9:16", "1:1"],
          supportedResolutions: ["720p"],
          supportedFormats: ["mp4"],
          supportsAudio: false,
          supportsImageInput: true,
          supportsNegativePrompt: true,
        },
        parameters: {
          duration: { min: 1, max: 5, default: 5 },
          aspectRatio: {
            options: ["16:9", "9:16", "1:1"],
            default: "16:9",
          },
          quality: {
            options: ["standard"],
            default: "standard",
          },
          guidanceScale: { min: 1, max: 20, default: 7 },
          inferenceSteps: { min: 10, max: 100, default: 50 },
        },
        pricing: {
          costPerSecond: 0.08, // $0.08 per second
          currency: "USD",
          tier: "standard",
        },
        isAvailable: true,
        isBeta: false,
      },
    ];

    // Register Google models
    googleModels.forEach((model) => {
      this.models.set(model.id, model);
    });
    this.providerModels.set("google", googleModels);
  }

  /**
   * Get all available models
   */
  public getAllModels(): VideoModel[] {
    return Array.from(this.models.values()).filter(
      (model) => model.isAvailable
    );
  }

  /**
   * Get models by provider
   */
  public getModelsByProvider(provider: string): VideoModel[] {
    return this.providerModels.get(provider) || [];
  }

  /**
   * Get model by ID
   */
  public getModel(modelId: string): VideoModel | undefined {
    return this.models.get(modelId);
  }

  /**
   * Get default model for video generation
   */
  public getDefaultModel(): VideoModel {
    // Default to Veo 3.0, fallback to Veo 2.0
    const defaultModel =
      this.getModel("veo-3.0-generate-001") ||
      this.getModel("veo-2.0-generate-001") ||
      this.getAllModels()[0];

    if (!defaultModel) {
      throw new Error("No default model available");
    }

    return defaultModel;
  }

  /**
   * Get recommended model based on requirements
   */
  public getRecommendedModel(requirements: {
    maxDuration?: number;
    needsAudio?: boolean;
    budget?: "low" | "medium" | "high";
    quality?: "standard" | "high";
  }): VideoModel {
    const availableModels = this.getAllModels();

    // Filter by requirements
    let candidates = availableModels.filter((model) => {
      if (
        requirements.maxDuration &&
        model.capabilities.maxDuration < requirements.maxDuration
      ) {
        return false;
      }
      if (requirements.needsAudio && !model.capabilities.supportsAudio) {
        return false;
      }
      return true;
    });

    if (candidates.length === 0) {
      return this.getDefaultModel();
    }

    // Sort by budget preference
    if (requirements.budget === "low") {
      candidates.sort(
        (a, b) =>
          (a.pricing?.costPerSecond || 0) - (b.pricing?.costPerSecond || 0)
      );
    } else if (requirements.budget === "high") {
      candidates.sort(
        (a, b) =>
          (b.pricing?.costPerSecond || 0) - (a.pricing?.costPerSecond || 0)
      );
    }

    const recommendedModel = candidates[0];
    if (!recommendedModel) {
      return this.getDefaultModel();
    }

    return recommendedModel;
  }

  /**
   * Validate model availability
   */
  public isModelAvailable(modelId: string): boolean {
    const model = this.getModel(modelId);
    return model ? model.isAvailable : false;
  }

  /**
   * Get model capabilities
   */
  public getModelCapabilities(modelId: string): ModelCapabilities | undefined {
    const model = this.getModel(modelId);
    return model?.capabilities;
  }

  /**
   * Get model parameters
   */
  public getModelParameters(modelId: string): ModelParameters | undefined {
    const model = this.getModel(modelId);
    return model?.parameters;
  }

  /**
   * Register a new model (for future extensibility)
   */
  public registerModel(model: VideoModel): void {
    this.models.set(model.id, model);

    // Update provider models
    const providerModels = this.providerModels.get(model.provider) || [];
    providerModels.push(model);
    this.providerModels.set(model.provider, providerModels);
  }

  /**
   * Update model availability
   */
  public updateModelAvailability(modelId: string, isAvailable: boolean): void {
    const model = this.models.get(modelId);
    if (model) {
      model.isAvailable = isAvailable;
    }
  }

  /**
   * Get providers list
   */
  public getProviders(): string[] {
    return Array.from(this.providerModels.keys());
  }

  /**
   * Get models grouped by provider
   */
  public getModelsGroupedByProvider(): Record<string, VideoModel[]> {
    const grouped: Record<string, VideoModel[]> = {};

    for (const [provider, models] of this.providerModels.entries()) {
      grouped[provider] = models.filter((model) => model.isAvailable);
    }

    return grouped;
  }
}

// Export singleton instance
export const modelRegistry = ModelRegistry.getInstance();
