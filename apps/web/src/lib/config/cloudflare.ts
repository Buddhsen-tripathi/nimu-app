/**
 * Cloudflare Configuration
 *
 * Centralized configuration for Cloudflare Worker integration.
 */

export interface CloudflareConfig {
  workerUrl: string;
  apiKey?: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

/**
 * Get Cloudflare configuration from environment variables
 */
export function getCloudflareConfig(): CloudflareConfig {
  return {
    workerUrl:
      process.env.CLOUDFLARE_WORKER_URL ||
      "https://nimu-generation-worker.amaanrizvi73.workers.dev",
    apiKey: process.env.CLOUDFLARE_WORKER_API_KEY,
    timeout: parseInt(process.env.CLOUDFLARE_WORKER_TIMEOUT || "30000"),
    retryAttempts: parseInt(
      process.env.CLOUDFLARE_WORKER_RETRY_ATTEMPTS || "3"
    ),
    retryDelay: parseInt(process.env.CLOUDFLARE_WORKER_RETRY_DELAY || "1000"),
  };
}

/**
 * Default Cloudflare configuration
 */
export const DEFAULT_CLOUDFLARE_CONFIG: CloudflareConfig = {
  workerUrl: "https://nimu-generation-worker.amaanrizvi73.workers.dev",
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
};
