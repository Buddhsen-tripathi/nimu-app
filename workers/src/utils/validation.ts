// Input validation utilities for Cloudflare Workers

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ValidationResult {
  success: boolean;
  errors: ValidationError[];
  data?: any;
}

/**
 * Validate generation request data
 */
export function validateGenerationRequest(data: any): ValidationResult {
  const errors: ValidationError[] = [];

  // Required fields
  if (!data.conversationId || typeof data.conversationId !== "string") {
    errors.push({
      field: "conversationId",
      message: "Conversation ID is required and must be a string",
    });
  }

  if (!data.messageId || typeof data.messageId !== "string") {
    errors.push({
      field: "messageId",
      message: "Message ID is required and must be a string",
    });
  }

  if (!data.type || !["video", "audio"].includes(data.type)) {
    errors.push({
      field: "type",
      message: 'Type must be either "video" or "audio"',
    });
  }

  if (
    !data.provider ||
    ![
      "veo3",
      "runway",
      "pika",
      "stable_video",
      "elevenlabs",
      "murf",
      "synthesia",
    ].includes(data.provider)
  ) {
    errors.push({
      field: "provider",
      message: "Provider must be one of the supported providers",
    });
  }

  if (
    !data.model ||
    typeof data.model !== "string" ||
    data.model.trim().length === 0
  ) {
    errors.push({
      field: "model",
      message: "Model is required and must be a non-empty string",
    });
  }

  if (
    !data.prompt ||
    typeof data.prompt !== "string" ||
    data.prompt.trim().length === 0
  ) {
    errors.push({
      field: "prompt",
      message: "Prompt is required and must be a non-empty string",
    });
  }

  // Length validation
  if (data.prompt && data.prompt.length > 2000) {
    errors.push({
      field: "prompt",
      message: "Prompt must be less than 2000 characters",
    });
  }

  if (data.model && data.model.length > 100) {
    errors.push({
      field: "model",
      message: "Model name must be less than 100 characters",
    });
  }

  // Parameters validation
  if (data.parameters && typeof data.parameters !== "object") {
    errors.push({
      field: "parameters",
      message: "Parameters must be an object",
    });
  }

  return {
    success: errors.length === 0,
    errors,
    data: errors.length === 0 ? data : undefined,
  };
}

/**
 * Validate clarification submission data
 */
export function validateClarificationSubmission(data: any): ValidationResult {
  const errors: ValidationError[] = [];

  if (
    !data.clarificationResponses ||
    typeof data.clarificationResponses !== "object"
  ) {
    errors.push({
      field: "clarificationResponses",
      message: "Clarification responses are required and must be an object",
    });
  }

  return {
    success: errors.length === 0,
    errors,
    data: errors.length === 0 ? data : undefined,
  };
}

/**
 * Validate job ID format
 */
export function validateJobId(jobId: string): boolean {
  // UUID v4 format validation
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(jobId);
}

/**
 * Validate generation ID format
 */
export function validateGenerationId(generationId: string): boolean {
  return validateJobId(generationId); // Same format as job ID
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Sanitize string input
 */
export function sanitizeString(input: string): string {
  return input.trim().replace(/[<>]/g, "");
}

/**
 * Sanitize object input
 */
export function sanitizeObject(obj: any): any {
  if (typeof obj !== "object" || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item));
  }

  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Create error response
 */
export function createValidationErrorResponse(
  errors: ValidationError[]
): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: "Validation failed",
      details: errors,
    }),
    {
      status: 400,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
}
