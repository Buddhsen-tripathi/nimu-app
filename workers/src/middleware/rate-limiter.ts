/**
 * Rate Limiting Middleware
 *
 * Provides rate limiting functionality to prevent abuse
 * and ensure fair usage of the API.
 */

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (request: Request) => string; // Custom key generator
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

export class RateLimiter {
  private static store: Map<string, { count: number; resetTime: number }> =
    new Map();
  private static cleanupInterval: number | null = null;

  /**
   * Initialize rate limiter with cleanup
   */
  static initialize(): void {
    if (this.cleanupInterval) return;

    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(
      () => {
        this.cleanupExpiredEntries();
      },
      5 * 60 * 1000
    );
  }

  /**
   * Check rate limit for request
   */
  static checkLimit(
    request: Request,
    config: RateLimitConfig
  ): RateLimitResult {
    const key = config.keyGenerator
      ? config.keyGenerator(request)
      : this.getDefaultKey(request);

    const now = Date.now();
    const windowStart = now - config.windowMs;
    const resetTime = now + config.windowMs;

    // Get or create entry
    let entry = this.store.get(key);
    if (!entry || entry.resetTime <= now) {
      entry = { count: 0, resetTime };
      this.store.set(key, entry);
    }

    // Increment counter
    entry.count++;

    const remaining = Math.max(0, config.maxRequests - entry.count);
    const allowed = entry.count <= config.maxRequests;

    return {
      allowed,
      limit: config.maxRequests,
      remaining,
      resetTime: entry.resetTime,
      retryAfter: !allowed
        ? Math.ceil((entry.resetTime - now) / 1000)
        : undefined,
    };
  }

  /**
   * Get rate limit headers for response
   */
  static getHeaders(result: RateLimitResult): Record<string, string> {
    return {
      "X-RateLimit-Limit": result.limit.toString(),
      "X-RateLimit-Remaining": result.remaining.toString(),
      "X-RateLimit-Reset": Math.ceil(result.resetTime / 1000).toString(),
      ...(result.retryAfter && { "Retry-After": result.retryAfter.toString() }),
    };
  }

  /**
   * Generate default rate limit key
   */
  private static getDefaultKey(request: Request): string {
    const url = new URL(request.url);
    const ip =
      request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";

    return `${ip}:${url.pathname}`;
  }

  /**
   * Generate user-based rate limit key
   */
  static getUserKey(userId: string, pathname: string): string {
    return `user:${userId}:${pathname}`;
  }

  /**
   * Generate IP-based rate limit key
   */
  static getIPKey(request: Request, pathname: string): string {
    const ip =
      request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";

    return `ip:${ip}:${pathname}`;
  }

  /**
   * Clean up expired entries
   */
  private static cleanupExpiredEntries(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetTime <= now) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Get current store size (for monitoring)
   */
  static getStoreSize(): number {
    return this.store.size;
  }

  /**
   * Clear all entries (for testing)
   */
  static clear(): void {
    this.store.clear();
  }
}

/**
 * Predefined rate limit configurations
 */
export const RATE_LIMIT_CONFIGS = {
  // General API limits
  API_GENERAL: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 1000,
  },

  // Generation endpoints (more restrictive)
  API_GENERATIONS: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10,
    keyGenerator: (request: Request) => {
      const userId = request.headers.get("x-user-id");
      const pathname = new URL(request.url).pathname;
      return userId
        ? RateLimiter.getUserKey(userId, pathname)
        : RateLimiter.getIPKey(request, pathname);
    },
  },

  // Storage endpoints
  API_STORAGE: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 100,
    keyGenerator: (request: Request) => {
      const userId = request.headers.get("x-user-id");
      const pathname = new URL(request.url).pathname;
      return userId
        ? RateLimiter.getUserKey(userId, pathname)
        : RateLimiter.getIPKey(request, pathname);
    },
  },

  // Worker endpoints (very restrictive)
  API_WORKERS: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    keyGenerator: (request: Request) => {
      const ip = request.headers.get("cf-connecting-ip") || "unknown";
      return `workers:${ip}`;
    },
  },
} as const;

/**
 * Rate limit middleware function
 */
export function rateLimit(config: RateLimitConfig) {
  return (request: Request): RateLimitResult => {
    return RateLimiter.checkLimit(request, config);
  };
}
