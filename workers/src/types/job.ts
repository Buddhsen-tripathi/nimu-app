// Job-related types for Durable Objects

export interface JobData {
  id: string;
  generationId: string;
  userId: string;
  prompt: string;
  parameters: Record<string, any>;
  provider: string;
  model: string;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface JobState {
  id: string;
  status: JobStatus;
  progress: number;
  data: JobData;
  result?: JobResult;
  error?: string;
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
}

export type JobStatus =
  | "pending"
  | "queued"
  | "active"
  | "completed"
  | "failed"
  | "cancelled"
  | "retrying";

export interface JobResult {
  success: boolean;
  resultUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  fileSize?: number;
  resolution?: string;
  format?: string;
  metadata?: Record<string, any>;
  error?: string;
}

export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  totalProcessed: number;
  averageProcessingTime: number;
}

export interface QueueJob {
  id: string;
  priority: number;
  createdAt: Date;
  data: JobData;
  status: JobStatus;
  progress: number;
  estimatedCompletionTime?: Date;
}

export interface WorkerStats {
  isRunning: boolean;
  concurrency: number;
  name: string;
  processedJobs: number;
  failedJobs: number;
  uptime: string;
  lastHeartbeat?: Date;
}

export interface JobHistory {
  id: string;
  jobId: string;
  action:
    | "created"
    | "started"
    | "progress"
    | "completed"
    | "failed"
    | "retried"
    | "cancelled";
  timestamp: Date;
  data?: any;
  message?: string;
}
