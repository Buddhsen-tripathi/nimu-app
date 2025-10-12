// Generation-related types

export interface GenerationRequest {
  id: string;
  conversationId: string;
  messageId: string;
  userId: string;
  type: "video" | "audio";
  provider:
    | "veo3"
    | "runway"
    | "pika"
    | "stable_video"
    | "elevenlabs"
    | "murf"
    | "synthesia";
  model: string;
  prompt: string;
  parameters?: Record<string, any>;
  status: GenerationStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type GenerationStatus =
  | "pending_clarification"
  | "pending_confirmation"
  | "confirmed"
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export interface GenerationResult {
  success: boolean;
  resultUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  fileSize?: number;
  resolution?: string;
  format?: string;
  error?: string;
  metadata?: Record<string, any>;
}

export interface ClarificationQuestion {
  id: string;
  type: "text" | "select" | "multi_select" | "boolean";
  question: string;
  options?: string[];
  required: boolean;
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
}

export interface ClarificationResponse {
  questionId: string;
  value: string | string[] | boolean;
}

export interface GenerationClarification {
  questions: ClarificationQuestion[];
  responses?: ClarificationResponse[];
  submittedAt?: Date;
}

export interface GenerationMetadata {
  queuePosition?: number;
  processingTime?: number;
  estimatedCompletionTime?: Date;
  cost?: number;
  tokensUsed?: number;
  retryCount?: number;
  maxRetries?: number;
}
