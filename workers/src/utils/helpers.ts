// Helper utilities for Cloudflare Workers

/**
 * Generate a UUID v4
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Generate a unique job ID
 */
export function generateJobId(): string {
  return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate a unique generation ID
 */
export function generateGenerationId(): string {
  return generateUUID();
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries) {
        throw lastError;
      }

      const delay = baseDelay * Math.pow(2, attempt);
      await sleep(delay);
    }
  }

  throw lastError!;
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Format duration in seconds to human readable string
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes < 60) {
    return remainingSeconds > 0
      ? `${minutes}m ${remainingSeconds}s`
      : `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

/**
 * Calculate priority based on user tier and generation type
 */
export function calculateJobPriority(
  userTier: string,
  generationType: string
): number {
  let priority = 0;

  // Premium users get higher priority
  switch (userTier) {
    case "premium":
      priority += 10;
      break;
    case "pro":
      priority += 5;
      break;
    case "basic":
      priority += 1;
      break;
    default:
      priority += 0;
  }

  // Video generations get higher priority than audio
  if (generationType === "video") {
    priority += 3;
  } else if (generationType === "audio") {
    priority += 1;
  }

  return priority;
}

/**
 * Estimate processing time based on generation type and complexity
 */
export function estimateProcessingTime(
  generationType: string,
  promptLength: number
): number {
  let baseTime = 0;

  // Base time by type
  switch (generationType) {
    case "video":
      baseTime = 120; // 2 minutes
      break;
    case "audio":
      baseTime = 30; // 30 seconds
      break;
    default:
      baseTime = 60; // 1 minute
  }

  // Adjust based on prompt complexity
  if (promptLength > 500) {
    baseTime *= 1.5;
  } else if (promptLength > 200) {
    baseTime *= 1.2;
  }

  return Math.round(baseTime);
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  message: string,
  status: number = 500,
  details?: any
): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: message,
      details,
      timestamp: new Date().toISOString(),
    }),
    {
      status,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
}

/**
 * Create a standardized success response
 */
export function createSuccessResponse(
  data: any,
  status: number = 200
): Response {
  return new Response(
    JSON.stringify({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    }),
    {
      status,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
}

/**
 * Parse JSON with error handling
 */
export function parseJSON<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    console.error("JSON parse error:", error);
    return null;
  }
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Check if a value is empty (null, undefined, empty string, empty array, empty object)
 */
export function isEmpty(value: any): boolean {
  if (value === null || value === undefined) {
    return true;
  }

  if (typeof value === "string") {
    return value.trim().length === 0;
  }

  if (Array.isArray(value)) {
    return value.length === 0;
  }

  if (typeof value === "object") {
    return Object.keys(value).length === 0;
  }

  return false;
}

/**
 * Get environment variable with fallback
 */
export function getEnvVar(key: string, fallback?: string): string {
  const value = process.env[key];
  if (value === undefined && fallback === undefined) {
    throw new Error(`Environment variable ${key} is required`);
  }
  return value || fallback!;
}

/**
 * Log with timestamp
 */
export function log(
  level: "info" | "warn" | "error",
  message: string,
  data?: any
): void {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

  if (data) {
    console[level](logMessage, data);
  } else {
    console[level](logMessage);
  }
}
