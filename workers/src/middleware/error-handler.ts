/**
 * Error Handling Middleware
 *
 * Provides comprehensive error handling, logging, and response formatting
 * for the Cloudflare Worker application.
 */

export interface ErrorResponse {
  error: string;
  message: string;
  code?: string;
  details?: any;
  timestamp: string;
  requestId?: string;
}

export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public details?: any;
  public isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = "INTERNAL_ERROR",
    details?: any,
    isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, "VALIDATION_ERROR", details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = "Authentication required") {
    super(message, 401, "AUTHENTICATION_ERROR");
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = "Access denied") {
    super(message, 403, "AUTHORIZATION_ERROR");
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found") {
    super(message, 404, "NOT_FOUND_ERROR");
  }
}

export class ConflictError extends AppError {
  constructor(message: string = "Resource conflict") {
    super(message, 409, "CONFLICT_ERROR");
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = "Rate limit exceeded") {
    super(message, 429, "RATE_LIMIT_ERROR");
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message: string = "Service temporarily unavailable") {
    super(message, 503, "SERVICE_UNAVAILABLE_ERROR");
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string = "External service error") {
    super(message, 502, "EXTERNAL_SERVICE_ERROR", { service });
  }
}

/**
 * Error handler class
 */
export class ErrorHandler {
  /**
   * Handle errors and return appropriate response
   */
  static handleError(
    error: Error | AppError,
    request?: Request,
    requestId?: string
  ): Response {
    let appError: AppError;

    // Convert to AppError if needed
    if (error instanceof AppError) {
      appError = error;
    } else {
      appError = new AppError(
        error.message || "Internal server error",
        500,
        "INTERNAL_ERROR",
        undefined,
        false
      );
    }

    // Log error
    this.logError(appError, request, requestId);

    // Create error response
    const errorResponse: ErrorResponse = {
      error: appError.code,
      message: appError.message,
      timestamp: new Date().toISOString(),
      requestId,
    };

    // Add details if available and in development
    if (appError.details && this.isDevelopment()) {
      errorResponse.details = appError.details;
    }

    return new Response(JSON.stringify(errorResponse), {
      status: appError.statusCode,
      headers: {
        "Content-Type": "application/json",
        "X-Error-Code": appError.code,
      },
    });
  }

  /**
   * Handle async function with error catching
   */
  static async catchAsync<T>(
    fn: () => Promise<T>,
    request?: Request,
    requestId?: string
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Validate request and throw validation error if invalid
   */
  static validateRequest(
    condition: boolean,
    message: string,
    details?: any
  ): void {
    if (!condition) {
      throw new ValidationError(message, details);
    }
  }

  /**
   * Check authentication and throw error if not authenticated
   */
  static requireAuth(userId: string | undefined): void {
    if (!userId) {
      throw new AuthenticationError();
    }
  }

  /**
   * Check authorization and throw error if not authorized
   */
  static requireAuthz(
    condition: boolean,
    message: string = "Access denied"
  ): void {
    if (!condition) {
      throw new AuthorizationError(message);
    }
  }

  /**
   * Check if resource exists and throw error if not found
   */
  static requireExists<T>(
    resource: T | null | undefined,
    name: string = "Resource"
  ): T {
    if (!resource) {
      throw new NotFoundError(`${name} not found`);
    }
    return resource;
  }

  /**
   * Handle external service errors
   */
  static handleExternalServiceError(
    service: string,
    error: Error,
    operation: string
  ): ExternalServiceError {
    const message = `${service} ${operation} failed: ${error.message}`;
    return new ExternalServiceError(service, message);
  }

  /**
   * Handle timeout errors
   */
  static handleTimeoutError(
    operation: string,
    timeoutMs: number
  ): ServiceUnavailableError {
    const message = `${operation} timed out after ${timeoutMs}ms`;
    return new ServiceUnavailableError(message);
  }

  /**
   * Log error with context
   */
  private static logError(
    error: AppError,
    request?: Request,
    requestId?: string
  ): void {
    const logData = {
      timestamp: new Date().toISOString(),
      error: {
        name: error.name,
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
        stack: error.stack,
        details: error.details,
        isOperational: error.isOperational,
      },
      request: request
        ? {
            method: request.method,
            url: request.url,
            userAgent: request.headers.get("user-agent"),
            ip: request.headers.get("cf-connecting-ip"),
          }
        : undefined,
      requestId,
    };

    if (error.statusCode >= 500) {
      console.error("Server error:", JSON.stringify(logData, null, 2));
    } else {
      console.warn("Client error:", JSON.stringify(logData, null, 2));
    }
  }

  /**
   * Check if running in development mode
   */
  private static isDevelopment(): boolean {
    // This would be determined by environment variables
    return true; // For now, always show details in development
  }

  /**
   * Create standardized success response
   */
  static createSuccessResponse(
    data: any,
    statusCode: number = 200,
    requestId?: string
  ): Response {
    const response = {
      success: true,
      data,
      timestamp: new Date().toISOString(),
      ...(requestId && { requestId }),
    };

    return new Response(JSON.stringify(response), {
      status: statusCode,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Create standardized error response
   */
  static createErrorResponse(error: AppError, requestId?: string): Response {
    return this.handleError(error, undefined, requestId);
  }
}

/**
 * Error boundary wrapper for async functions
 */
export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  requestId?: string
) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      // Re-throw AppError instances
      if (error instanceof AppError) {
        throw error;
      }

      // Convert other errors to AppError
      throw new AppError(
        error instanceof Error ? error.message : "Unknown error",
        500,
        "INTERNAL_ERROR",
        undefined,
        false
      );
    }
  };
}

/**
 * Retry mechanism with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  requestId?: string
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxRetries) {
        break;
      }

      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms:`, {
        error: lastError.message,
        requestId,
      });

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}
