/**
 * Validation Utilities
 *
 * Provides request validation functionality for the Cloudflare Worker.
 */

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
  error?: string; // For backward compatibility
}

export interface GenerationRequest {
  prompt: string;
  parameters?: Record<string, any>;
  provider?: string;
  model?: string;
  priority?: number;
}

export interface ClarificationRequest {
  response: string;
  questionId?: string;
}

/**
 * Validate generation request
 */
export function validateGenerationRequest(data: any): ValidationResult {
  const errors: string[] = [];

  // Check if data is an object
  if (!data || typeof data !== "object") {
    errors.push("Request body must be an object");
  }

  // Check required fields
  if (!data.prompt || typeof data.prompt !== "string") {
    errors.push("Prompt is required and must be a string");
  }

  // Validate prompt length
  if (data.prompt && data.prompt.length < 3) {
    errors.push("Prompt must be at least 3 characters long");
  }

  if (data.prompt && data.prompt.length > 5000) {
    errors.push("Prompt must be less than 5000 characters");
  }

  // Validate parameters if provided
  if (data.parameters !== undefined) {
    if (typeof data.parameters !== "object" || Array.isArray(data.parameters)) {
      errors.push("Parameters must be an object");
    }
  }

  // Validate provider if provided
  if (data.provider && typeof data.provider !== "string") {
    errors.push("Provider must be a string");
  }

  // Validate model if provided
  if (data.model && typeof data.model !== "string") {
    errors.push("Model must be a string");
  }

  // Validate priority if provided
  if (data.priority !== undefined) {
    if (
      typeof data.priority !== "number" ||
      data.priority < 0 ||
      data.priority > 10
    ) {
      errors.push("Priority must be a number between 0 and 10");
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
    error: errors.length > 0 ? errors[0] : undefined,
  };
}

/**
 * Validate clarification request
 */
export function validateClarificationRequest(data: any): ValidationResult {
  const errors: string[] = [];

  // Check if data is an object
  if (!data || typeof data !== "object") {
    errors.push("Request body must be an object");
  }

  // Check required fields
  if (!data.response || typeof data.response !== "string") {
    errors.push("Response is required and must be a string");
  }

  // Validate response length
  if (data.response && data.response.length < 1) {
    errors.push("Response cannot be empty");
  }

  if (data.response && data.response.length > 2000) {
    errors.push("Response must be less than 2000 characters");
  }

  // Validate questionId if provided
  if (data.questionId !== undefined) {
    if (typeof data.questionId !== "string") {
      errors.push("Question ID must be a string");
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
    error: errors.length > 0 ? errors[0] : undefined,
  };
}

/**
 * Validate video upload request
 */
export function validateVideoUploadRequest(data: any): ValidationResult {
  const errors: string[] = [];

  // Check if data is an object
  if (!data || typeof data !== "object") {
    errors.push("Request body must be an object");
  }

  // Check required fields
  if (!data.filename || typeof data.filename !== "string") {
    errors.push("Filename is required and must be a string");
  }

  // Validate filename
  if (data.filename && !data.filename.match(/^[a-zA-Z0-9._-]+$/)) {
    errors.push("Filename contains invalid characters");
  }

  // Validate file size if provided
  if (data.size !== undefined) {
    if (typeof data.size !== "number" || data.size <= 0) {
      errors.push("File size must be a positive number");
    }
    if (data.size > 500 * 1024 * 1024) {
      // 500MB limit
      errors.push("File size exceeds 500MB limit");
    }
  }

  // Validate content type if provided
  if (data.contentType && typeof data.contentType !== "string") {
    errors.push("Content type must be a string");
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
    error: errors.length > 0 ? errors[0] : undefined,
  };
}

/**
 * Validate worker registration request
 */
export function validateWorkerRegistrationRequest(data: any): ValidationResult {
  const errors: string[] = [];

  // Check if data is an object
  if (!data || typeof data !== "object") {
    errors.push("Request body must be an object");
  }

  // Check required fields
  if (!data.workerId || typeof data.workerId !== "string") {
    errors.push("Worker ID is required and must be a string");
  }

  if (!data.workerInfo || typeof data.workerInfo !== "object") {
    errors.push("Worker info is required and must be an object");
  }

  // Validate worker info if provided
  if (data.workerInfo) {
    if (data.workerInfo.name && typeof data.workerInfo.name !== "string") {
      errors.push("Worker name must be a string");
    }

    if (
      data.workerInfo.version &&
      typeof data.workerInfo.version !== "string"
    ) {
      errors.push("Worker version must be a string");
    }

    if (
      data.workerInfo.capabilities &&
      !Array.isArray(data.workerInfo.capabilities)
    ) {
      errors.push("Worker capabilities must be an array");
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
    error: errors.length > 0 ? errors[0] : undefined,
  };
}

/**
 * Validate heartbeat request
 */
export function validateHeartbeatRequest(data: any): ValidationResult {
  const errors: string[] = [];

  // Check if data is an object
  if (!data || typeof data !== "object") {
    errors.push("Request body must be an object");
  }

  // Check required fields
  if (!data.workerId || typeof data.workerId !== "string") {
    errors.push("Worker ID is required and must be a string");
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
    error: errors.length > 0 ? errors[0] : undefined,
  };
}

/**
 * Sanitize string input
 */
export function sanitizeString(input: string): string {
  if (typeof input !== "string") {
    return "";
  }

  // Remove potentially dangerous characters
  return input
    .replace(/[<>]/g, "") // Remove angle brackets
    .replace(/javascript:/gi, "") // Remove javascript: protocol
    .replace(/on\w+=/gi, "") // Remove event handlers
    .trim();
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL format
 */
export function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate numeric range
 */
export function validateRange(
  value: number,
  min: number,
  max: number
): boolean {
  return typeof value === "number" && value >= min && value <= max;
}
