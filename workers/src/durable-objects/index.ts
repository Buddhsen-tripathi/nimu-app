/**
 * Durable Objects Index
 *
 * This file exports all Durable Object classes for use in the Cloudflare Workers environment.
 * Each Durable Object replaces a specific part of the BullMQ + Redis infrastructure.
 */

export { JobManagerDO } from "./JobManager";
export { QueueManagerDO } from "./QueueManager";

// Re-export types for convenience
export type {
  JobState,
  JobStatus,
  JobResult,
  JobHistory,
  JobData,
  QueueJob,
  QueueStats,
  WorkerStats,
} from "../types/job";

export type {
  GenerationRequest,
  GenerationStatus,
  GenerationResult,
  GenerationMetadata,
} from "../types/generation";
