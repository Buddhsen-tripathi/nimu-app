/**
 * Durable Objects Utilities
 *
 * Helper functions for working with Durable Objects in Cloudflare Workers.
 * These utilities provide convenient methods for accessing and managing Durable Objects.
 */

// Note: JobManagerDO and QueueManagerDO are not directly used in utilities
// They are exported for use in wrangler.toml configuration

export interface DurableObjectEnv {
  JOB_MANAGER: DurableObjectNamespace;
  QUEUE_MANAGER: DurableObjectNamespace;
}

/**
 * Get or create a JobManager Durable Object instance
 */
export function getJobManager(
  env: DurableObjectEnv,
  jobId?: string
): DurableObjectStub {
  const id = env.JOB_MANAGER.idFromName(jobId || "global");
  return env.JOB_MANAGER.get(id);
}

/**
 * Get or create a QueueManager Durable Object instance
 */
export function getQueueManager(env: DurableObjectEnv): DurableObjectStub {
  const id = env.QUEUE_MANAGER.idFromName("global");
  return env.QUEUE_MANAGER.get(id);
}

/**
 * Create a new JobManager for a specific job
 */
export function createJobManager(
  env: DurableObjectEnv,
  jobId: string
): DurableObjectStub {
  const id = env.JOB_MANAGER.idFromName(jobId);
  return env.JOB_MANAGER.get(id);
}

/**
 * Call a Durable Object method with error handling and retries
 */
export async function callDurableObject<T>(
  durableObject: DurableObjectStub,
  method: string,
  args: any[] = [],
  maxRetries: number = 3,
  retryDelay: number = 1000
): Promise<{ success: boolean; result?: T; error?: string }> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await durableObject.fetch(
        new Request(`http://localhost/${method}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(args),
        })
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const result = (await response.json()) as T;
      return { success: true, result };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        console.warn(
          `Attempt ${attempt} failed, retrying in ${retryDelay}ms:`,
          lastError.message
        );
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        retryDelay *= 2; // Exponential backoff
      }
    }
  }

  return {
    success: false,
    error: lastError?.message || "Unknown error after all retries",
  };
}

/**
 * Job Manager specific helper functions
 */
export class JobManagerHelper {
  constructor(private env: DurableObjectEnv) {}

  async createJob(jobData: any) {
    const jobManager = createJobManager(this.env, jobData.id);
    return callDurableObject(jobManager, "createJob", [jobData]);
  }

  async getJobStatus(jobId: string) {
    const jobManager = getJobManager(this.env, jobId);
    return callDurableObject(jobManager, "getJobStatus", [jobId]);
  }

  async updateJobStatus(jobId: string, status: string, additionalData?: any) {
    const jobManager = getJobManager(this.env, jobId);
    return callDurableObject(jobManager, "updateJobStatus", [
      jobId,
      status,
      additionalData,
    ]);
  }

  async updateProgress(jobId: string, progress: number, message?: string) {
    const jobManager = getJobManager(this.env, jobId);
    return callDurableObject(jobManager, "updateProgress", [
      jobId,
      progress,
      message,
    ]);
  }

  async completeJob(jobId: string, result: any) {
    const jobManager = getJobManager(this.env, jobId);
    return callDurableObject(jobManager, "completeJob", [jobId, result]);
  }

  async failJob(jobId: string, error: string) {
    const jobManager = getJobManager(this.env, jobId);
    return callDurableObject(jobManager, "failJob", [jobId, error]);
  }

  async retryJob(jobId: string) {
    const jobManager = getJobManager(this.env, jobId);
    return callDurableObject(jobManager, "retryJob", [jobId]);
  }

  async cancelJob(jobId: string) {
    const jobManager = getJobManager(this.env, jobId);
    return callDurableObject(jobManager, "cancelJob", [jobId]);
  }

  async getJobHistory(jobId: string) {
    const jobManager = getJobManager(this.env, jobId);
    return callDurableObject(jobManager, "getJobHistory", [jobId]);
  }

  async getJobStats() {
    const jobManager = getJobManager(this.env);
    return callDurableObject(jobManager, "getJobStats", []);
  }

  async cleanupOldJobs(olderThanDays: number = 7) {
    const jobManager = getJobManager(this.env);
    return callDurableObject(jobManager, "cleanupOldJobs", [olderThanDays]);
  }
}

/**
 * Queue Manager specific helper functions
 */
export class QueueManagerHelper {
  constructor(private env: DurableObjectEnv) {}

  async addToQueue(jobData: any) {
    const queueManager = getQueueManager(this.env);
    return callDurableObject(queueManager, "addToQueue", [jobData]);
  }

  async getNextJob(workerId?: string) {
    const queueManager = getQueueManager(this.env);
    return callDurableObject(queueManager, "getNextJob", [workerId]);
  }

  async updateQueuePosition(jobId: string, newPriority?: number) {
    const queueManager = getQueueManager(this.env);
    return callDurableObject(queueManager, "updateQueuePosition", [
      jobId,
      newPriority,
    ]);
  }

  async completeJob(jobId: string, workerId?: string) {
    const queueManager = getQueueManager(this.env);
    return callDurableObject(queueManager, "completeJob", [jobId, workerId]);
  }

  async failJob(jobId: string, workerId?: string, shouldRetry: boolean = true) {
    const queueManager = getQueueManager(this.env);
    return callDurableObject(queueManager, "failJob", [
      jobId,
      workerId,
      shouldRetry,
    ]);
  }

  async getQueueStats() {
    const queueManager = getQueueManager(this.env);
    return callDurableObject(queueManager, "getQueueStats", []);
  }

  async pauseQueue() {
    const queueManager = getQueueManager(this.env);
    return callDurableObject(queueManager, "pauseQueue", []);
  }

  async resumeQueue() {
    const queueManager = getQueueManager(this.env);
    return callDurableObject(queueManager, "resumeQueue", []);
  }

  async clearQueue() {
    const queueManager = getQueueManager(this.env);
    return callDurableObject(queueManager, "clearQueue", []);
  }

  async getQueueStatus() {
    const queueManager = getQueueManager(this.env);
    return callDurableObject(queueManager, "getQueueStatus", []);
  }

  async registerWorker(workerId: string, workerInfo: any) {
    const queueManager = getQueueManager(this.env);
    return callDurableObject(queueManager, "registerWorker", [
      workerId,
      workerInfo,
    ]);
  }

  async updateWorkerHeartbeat(workerId: string) {
    const queueManager = getQueueManager(this.env);
    return callDurableObject(queueManager, "updateWorkerHeartbeat", [workerId]);
  }

  async cleanupInactiveWorkers(inactiveThresholdMinutes: number = 5) {
    const queueManager = getQueueManager(this.env);
    return callDurableObject(queueManager, "cleanupInactiveWorkers", [
      inactiveThresholdMinutes,
    ]);
  }
}

/**
 * Combined helper class for managing both Job and Queue operations
 */
export class DurableObjectManager {
  public jobManager: JobManagerHelper;
  public queueManager: QueueManagerHelper;

  constructor(env: DurableObjectEnv) {
    this.jobManager = new JobManagerHelper(env);
    this.queueManager = new QueueManagerHelper(env);
  }

  /**
   * Create a job and add it to the queue in one operation
   */
  async createAndQueueJob(jobData: any): Promise<{
    success: boolean;
    jobId?: string;
    queuePosition?: number;
    error?: string;
  }> {
    try {
      // Create the job
      const createResult = await this.jobManager.createJob(jobData);
      if (!createResult.success) {
        return {
          success: false,
          error: createResult.error || "Failed to create job",
        };
      }

      // Add to queue
      const queueResult = await this.queueManager.addToQueue(jobData);
      if (!queueResult.success) {
        // If queuing fails, we should clean up the created job
        await this.jobManager.cancelJob(jobData.id);
        return {
          success: false,
          error: queueResult.error || "Failed to queue job",
        };
      }

      return {
        success: true,
        jobId: jobData.id,
        queuePosition: (queueResult.result as any)?.queuePosition,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Process a job from queue to completion
   */
  async processJob(
    workerId: string
  ): Promise<{ success: boolean; job?: any; error?: string }> {
    try {
      // Get next job from queue
      const nextJobResult = await this.queueManager.getNextJob(workerId);
      if (!nextJobResult.success || !nextJobResult.result) {
        return {
          success: false,
          error: nextJobResult.error || "No jobs available",
        };
      }

      const job = nextJobResult.result;

      // Update job status to active
      await this.jobManager.updateJobStatus((job as any).id, "active");

      return { success: true, job };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Complete a job processing cycle
   */
  async completeJobProcessing(
    jobId: string,
    workerId: string,
    result?: any,
    error?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (error) {
        // Job failed
        await this.jobManager.failJob(jobId, error);
        await this.queueManager.failJob(jobId, workerId, true); // Retry failed jobs
      } else {
        // Job completed successfully
        await this.jobManager.completeJob(jobId, result);
        await this.queueManager.completeJob(jobId, workerId);
      }

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }
}

/**
 * Error types for Durable Object operations
 */
export class DurableObjectError extends Error {
  constructor(
    message: string,
    public operation: string,
    public durableObjectType: string,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = "DurableObjectError";
  }
}

/**
 * Retry configuration for Durable Object calls
 */
export interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
};
