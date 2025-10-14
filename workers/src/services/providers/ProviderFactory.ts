/**
 * Provider Factory
 *
 * Factory for creating video generation provider instances.
 * Handles provider instantiation and configuration management.
 */

import { VideoGenerationProvider, type ProviderType } from "./types";
import { createGoogleProvider } from "./GoogleProvider";

export interface ProviderConfig {
  google?: {
    apiKey: string;
    baseUrl?: string;
  };
  runway?: {
    apiKey: string;
    baseUrl?: string;
  };
  pika?: {
    apiKey: string;
    baseUrl?: string;
  };
  stable_video?: {
    apiKey: string;
    baseUrl?: string;
  };
}

export class ProviderFactory {
  private static instance: ProviderFactory;
  private providers: Map<ProviderType, VideoGenerationProvider> = new Map();
  private config: ProviderConfig;

  private constructor(config: ProviderConfig) {
    this.config = config;
  }

  public static getInstance(config?: ProviderConfig): ProviderFactory {
    if (!ProviderFactory.instance) {
      if (!config) {
        throw new Error(
          "ProviderFactory requires configuration on first initialization"
        );
      }
      ProviderFactory.instance = new ProviderFactory(config);
    }
    return ProviderFactory.instance;
  }

  /**
   * Get provider instance
   */
  public getProvider(providerType: ProviderType): VideoGenerationProvider {
    // Return cached provider if available
    if (this.providers.has(providerType)) {
      return this.providers.get(providerType)!;
    }

    // Create new provider instance
    const provider = this.createProvider(providerType);
    this.providers.set(providerType, provider);
    return provider;
  }

  /**
   * Create provider instance
   */
  private createProvider(providerType: ProviderType): VideoGenerationProvider {
    switch (providerType) {
      case "google":
        if (!this.config.google?.apiKey) {
          throw new Error("Google API key not configured");
        }
        return createGoogleProvider(
          this.config.google.apiKey,
          this.config.google.baseUrl
        );

      case "runway":
        throw new Error("Runway provider not yet implemented");

      case "pika":
        throw new Error("Pika provider not yet implemented");

      case "stable_video":
        throw new Error("Stable Video provider not yet implemented");

      case "elevenlabs":
        throw new Error("ElevenLabs provider not yet implemented");

      case "murf":
        throw new Error("Murf provider not yet implemented");

      case "synthesia":
        throw new Error("Synthesia provider not yet implemented");

      default:
        throw new Error(`Unknown provider type: ${providerType}`);
    }
  }

  /**
   * Get provider for model
   */
  public getProviderForModel(modelId: string): VideoGenerationProvider {
    // Determine provider from model ID
    const providerType = this.getProviderTypeFromModel(modelId);
    return this.getProvider(providerType);
  }

  /**
   * Determine provider type from model ID
   */
  private getProviderTypeFromModel(modelId: string): ProviderType {
    if (modelId.startsWith("veo-") || modelId.startsWith("imagen-")) {
      return "google";
    }
    if (modelId.startsWith("runway-")) {
      return "runway";
    }
    if (modelId.startsWith("pika-")) {
      return "pika";
    }
    if (modelId.startsWith("stable-video-")) {
      return "stable_video";
    }

    // Default to Google for now
    return "google";
  }

  /**
   * Get all available providers
   */
  public getAvailableProviders(): ProviderType[] {
    const available: ProviderType[] = [];

    if (this.config.google?.apiKey) {
      available.push("google");
    }
    if (this.config.runway?.apiKey) {
      available.push("runway");
    }
    if (this.config.pika?.apiKey) {
      available.push("pika");
    }
    if (this.config.stable_video?.apiKey) {
      available.push("stable_video");
    }

    return available;
  }

  /**
   * Update provider configuration
   */
  public updateConfig(config: Partial<ProviderConfig>): void {
    this.config = { ...this.config, ...config };

    // Clear cached providers to force recreation with new config
    this.providers.clear();
  }

  /**
   * Check if provider is available
   */
  public isProviderAvailable(providerType: ProviderType): boolean {
    try {
      this.getProvider(providerType);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Create provider factory instance
 */
export function createProviderFactory(config: ProviderConfig): ProviderFactory {
  return ProviderFactory.getInstance(config);
}
