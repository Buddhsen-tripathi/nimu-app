import { Queue, Worker, QueueEvents } from "bullmq";
import type { Job } from "bullmq";
import { redis } from "../redis";
import {
  createGenerationJob,
  updateGenerationJob,
  updateGenerationStatus,
  getGenerationById,
} from "../queries/generations";
import type { Generation } from "../../db/schema";

// Queue configuration
export const QUEUE_NAME = "video-generation";
export const MAX_CONCURRENT_JOBS = 3;
export const JOB_ATTEMPTS = 3;
export const JOB_BACKOFF_DELAY = 5000; // 5 seconds

// Job data interface
export interface GenerationJobData {
  generationId: string;
  userId: string;
  prompt: string;
  parameters: any;
  provider: string;
  model: string;
}

// Job result interface
export interface GenerationJobResult {
  success: boolean;
  resultUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  fileSize?: number;
  resolution?: string;
  format?: string;
  error?: string;
}

// Create the queue
export const generationQueue = new Queue<GenerationJobData>(QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    attempts: JOB_ATTEMPTS,
    backoff: {
      type: "exponential",
      delay: JOB_BACKOFF_DELAY,
    },
    removeOnComplete: 10, // Keep last 10 completed jobs
    removeOnFail: 50, // Keep last 50 failed jobs
  },
});

// Queue events
export const queueEvents = new QueueEvents(QUEUE_NAME, {
  connection: redis,
});

// Queue event handlers
queueEvents.on("waiting", ({ jobId }: { jobId: string }) => {
  console.log(`Job ${jobId} is waiting`);
});

queueEvents.on("active", ({ jobId }: { jobId: string }) => {
  console.log(`Job ${jobId} is now active`);
});

queueEvents.on(
  "completed",
  ({ jobId, returnvalue }: { jobId: string; returnvalue: any }) => {
    console.log(`Job ${jobId} completed successfully`);
  }
);

queueEvents.on(
  "failed",
  ({ jobId, failedReason }: { jobId: string; failedReason: string }) => {
    console.error(`Job ${jobId} failed:`, failedReason);
  }
);

queueEvents.on("stalled", ({ jobId }: { jobId: string }) => {
  console.warn(`Job ${jobId} stalled`);
});

// Queue utility functions
export class GenerationQueueUtils {
  /**
   * Add a generation job to the queue
   */
  static async addGenerationJob(
    data: GenerationJobData
  ): Promise<Job<GenerationJobData>> {
    // Create generation job record in database
    const dbJob = await createGenerationJob({
      id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Generate unique ID
      generationId: data.generationId,
      jobId: "", // Will be updated when job is created
      status: "pending_clarification",
      progress: 0,
      retryCount: 0,
      maxRetries: JOB_ATTEMPTS,
    });

    if (!dbJob) {
      throw new Error("Failed to create generation job in database");
    }

    // Add job to BullMQ queue
    const job = await generationQueue.add("generate-video", data, {
      jobId: dbJob.id, // Use database job ID as BullMQ job ID
      priority: this.calculatePriority(data),
    });

    // Update database job with BullMQ job ID
    await updateGenerationJob(dbJob.id, "pending_clarification", {
      jobId: job.id,
    });

    return job;
  }

  /**
   * Calculate job priority based on user tier, generation type, etc.
   */
  static calculatePriority(data: GenerationJobData): number {
    // Higher number = higher priority
    let priority = 0;

    // Premium users get higher priority
    // TODO: Implement user tier checking
    // if (userTier === "premium") priority += 10;

    // Video generations get higher priority than audio
    if (data.provider === "veo3") priority += 5;

    return priority;
  }

  /**
   * Get job status from BullMQ
   */
  static async getJobStatus(jobId: string): Promise<{
    id: string;
    name: string;
    data: GenerationJobData;
    progress: number;
    state: string;
    returnvalue?: GenerationJobResult;
    failedReason?: string;
    processedOn?: number;
    finishedOn?: number;
  } | null> {
    try {
      const job = await generationQueue.getJob(jobId);
      if (!job) return null;

      return {
        id: job.id!,
        name: job.name,
        data: job.data,
        progress: (job.progress as number) || 0,
        state: await job.getState(),
        returnvalue: job.returnvalue,
        failedReason: job.failedReason,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
      };
    } catch (error) {
      console.error(`Error getting job status for ${jobId}:`, error);
      return null;
    }
  }

  /**
   * Get queue statistics
   */
  static async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      generationQueue.getWaiting(),
      generationQueue.getActive(),
      generationQueue.getCompleted(),
      generationQueue.getFailed(),
      generationQueue.getDelayed(),
    ]);

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
    };
  }

  /**
   * Pause the queue
   */
  static async pauseQueue(): Promise<void> {
    await generationQueue.pause();
  }

  /**
   * Resume the queue
   */
  static async resumeQueue(): Promise<void> {
    await generationQueue.resume();
  }

  /**
   * Clean old jobs
   */
  static async cleanOldJobs(
    grace: number = 24 * 60 * 60 * 1000
  ): Promise<void> {
    await generationQueue.clean(grace, 100, "completed");
    await generationQueue.clean(grace, 100, "failed");
  }

  /**
   * Get jobs by state
   */
  static async getJobsByState(
    state: string,
    start: number = 0,
    end: number = 10
  ): Promise<any[]> {
    const jobs = await generationQueue.getJobs([state as any], start, end);
    return jobs.map((job: Job) => ({
      id: job.id,
      name: job.name,
      data: job.data,
      progress: job.progress,
      state: state,
      createdAt: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
    }));
  }

  /**
   * Retry failed job
   */
  static async retryJob(jobId: string): Promise<void> {
    const job = await generationQueue.getJob(jobId);
    if (job) {
      await job.retry();
    }
  }

  /**
   * Remove job from queue
   */
  static async removeJob(jobId: string): Promise<void> {
    const job = await generationQueue.getJob(jobId);
    if (job) {
      await job.remove();
    }
  }
}

// Graceful shutdown
export async function closeGenerationQueue(): Promise<void> {
  try {
    await generationQueue.close();
    await queueEvents.close();
    console.log("Generation queue closed gracefully");
  } catch (error) {
    console.error("Error closing generation queue:", error);
  }
}

export default generationQueue;
