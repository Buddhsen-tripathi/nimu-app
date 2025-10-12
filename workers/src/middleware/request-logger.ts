/**
 * Request Logging Middleware
 *
 * Provides structured logging for all incoming requests
 * to help with debugging and monitoring.
 */

export interface RequestLog {
  timestamp: string;
  method: string;
  url: string;
  pathname: string;
  userAgent?: string;
  ip?: string;
  userId?: string;
  requestId: string;
  duration?: number;
  statusCode?: number;
  error?: string;
}

export class RequestLogger {
  private static requestCount = 0;

  /**
   * Generate unique request ID
   */
  static generateRequestId(): string {
    this.requestCount++;
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 6);
    return `req_${timestamp}_${this.requestCount}_${random}`;
  }

  /**
   * Log incoming request
   */
  static logRequest(
    request: Request,
    requestId: string,
    userId?: string
  ): RequestLog {
    const url = new URL(request.url);
    const userAgent = request.headers.get("user-agent") || undefined;
    const ip =
      request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      undefined;

    const log: RequestLog = {
      timestamp: new Date().toISOString(),
      method: request.method,
      url: request.url,
      pathname: url.pathname,
      userAgent: userAgent || "unknown",
      ip: ip || "unknown",
      userId: userId || "unknown",
      requestId,
    };

    console.log("Request received:", JSON.stringify(log, null, 2));
    return log;
  }

  /**
   * Log request completion
   */
  static logResponse(
    requestLog: RequestLog,
    statusCode: number,
    duration: number,
    error?: string
  ): void {
    const responseLog = {
      ...requestLog,
      statusCode,
      duration: Math.round(duration),
      error,
      completedAt: new Date().toISOString(),
    };

    console.log("Request completed:", JSON.stringify(responseLog, null, 2));
  }

  /**
   * Log error
   */
  static logError(
    requestLog: RequestLog,
    error: Error,
    context?: string
  ): void {
    const errorLog = {
      ...requestLog,
      error: error.message,
      stack: error.stack,
      context,
      errorType: error.constructor.name,
      occurredAt: new Date().toISOString(),
    };

    console.error("Request error:", JSON.stringify(errorLog, null, 2));
  }

  /**
   * Log performance metrics
   */
  static logPerformance(
    requestLog: RequestLog,
    operation: string,
    duration: number,
    metadata?: Record<string, any>
  ): void {
    const performanceLog = {
      ...requestLog,
      operation,
      duration: Math.round(duration),
      metadata,
      timestamp: new Date().toISOString(),
    };

    console.log("Performance metric:", JSON.stringify(performanceLog, null, 2));
  }
}

/**
 * Performance tracking utility
 */
export class PerformanceTracker {
  private startTime: number;
  private requestLog: RequestLog;

  constructor(requestLog: RequestLog) {
    this.requestLog = requestLog;
    this.startTime = Date.now();
  }

  /**
   * Track operation duration
   */
  trackOperation(operation: string, metadata?: Record<string, any>): void {
    const duration = Date.now() - this.startTime;
    RequestLogger.logPerformance(
      this.requestLog,
      operation,
      duration,
      metadata
    );
  }

  /**
   * Get total elapsed time
   */
  getElapsedTime(): number {
    return Date.now() - this.startTime;
  }
}
