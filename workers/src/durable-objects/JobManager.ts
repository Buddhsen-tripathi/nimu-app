/**
 * JobManager Durable Object
 *
 * This Durable Object manages individual generation jobs and their states.
 * It replaces Redis for job state management in the Cloudflare Workers environment.
 *
 * Key Features:
 * - Persistent job state storage
 * - Job lifecycle management (pending -> active -> completed/failed)
 * - Retry logic with exponential backoff
 * - Progress tracking
 * - Job history and audit trail
 * - Automatic cleanup of old jobs
 */

import type {
  JobState,
  JobStatus,
  JobResult,
  JobHistory,
  JobData,
} from "../types/job";

export interface JobManagerEnv {
  // Environment bindings will be added here as needed
}

export class JobManager {
  private state: DurableObjectState;
  // private _env: JobManagerEnv; // TODO: Use for environment variables, bindings, etc.

  // In-memory cache for frequently accessed data
  private jobsCache: Map<string, JobState> = new Map();
  private isInitialized = false;

  constructor(state: DurableObjectState, _env: JobManagerEnv) {
    this.state = state;
    // this._env = env; // TODO: Use for environment variables, bindings, etc.
    // Note: env is available for future use (environment variables, bindings, etc.)
  }

  /**
   * Initialize the JobManager by loading existing jobs from storage
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load all existing jobs from storage
      const jobsList = await this.state.storage.list({ prefix: "job:" });

      for (const [key, jobState] of jobsList.entries()) {
        const jobId = key.replace("job:", "");
        this.jobsCache.set(jobId, jobState as JobState);
      }

      this.isInitialized = true;
      console.log(
        `JobManager initialized with ${this.jobsCache.size} existing jobs`
      );
    } catch (error) {
      console.error("Failed to initialize JobManager:", error);
      throw new Error("JobManager initialization failed");
    }
  }

  /**
   * Create a new generation job
   */
  async createJob(
    jobData: JobData
  ): Promise<{ success: boolean; jobId: string; error?: string }> {
    try {
      await this.initialize();

      const jobId = jobData.id;

      // Check if job already exists
      if (this.jobsCache.has(jobId)) {
        return { success: false, jobId, error: "Job already exists" };
      }

      // Create new job state
      const jobState: JobState = {
        id: jobId,
        status: "pending",
        progress: 0,
        data: jobData,
        retryCount: 0,
        maxRetries: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Store job state
      await this.state.storage.put(`job:${jobId}`, jobState);
      this.jobsCache.set(jobId, jobState);

      // Create initial history entry
      await this.addJobHistory(jobId, "created", {
        message: "Job created successfully",
      });

      console.log(`Created new job: ${jobId}`);
      return { success: true, jobId };
    } catch (error) {
      console.error("Failed to create job:", error);
      return {
        success: false,
        jobId: jobData.id,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Update job status
   */
  async updateJobStatus(
    jobId: string,
    status: JobStatus,
    additionalData?: any
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await this.initialize();

      const jobState = this.jobsCache.get(jobId);
      if (!jobState) {
        return { success: false, error: "Job not found" };
      }

      // Validate status transition
      if (!this.isValidStatusTransition(jobState.status, status)) {
        return {
          success: false,
          error: `Invalid status transition from ${jobState.status} to ${status}`,
        };
      }

      // Update job state
      const updatedJobState: JobState = {
        ...jobState,
        status,
        updatedAt: new Date(),
        ...(status === "active" &&
          !jobState.startedAt && { startedAt: new Date() }),
        ...(status === "completed" && { completedAt: new Date() }),
        ...(status === "failed" && { failedAt: new Date() }),
        ...additionalData,
      };

      // Store updated state
      await this.state.storage.put(`job:${jobId}`, updatedJobState);
      this.jobsCache.set(jobId, updatedJobState);

      // Add history entry
      await this.addJobHistory(
        jobId,
        this.getHistoryActionFromStatus(status),
        additionalData
      );

      console.log(`Updated job ${jobId} status to ${status}`);
      return { success: true };
    } catch (error) {
      console.error(`Failed to update job ${jobId} status:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Update job progress
   */
  async updateProgress(
    jobId: string,
    progress: number,
    message?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await this.initialize();

      const jobState = this.jobsCache.get(jobId);
      if (!jobState) {
        return { success: false, error: "Job not found" };
      }

      // Validate progress value
      if (progress < 0 || progress > 100) {
        return { success: false, error: "Progress must be between 0 and 100" };
      }

      // Update job state
      const updatedJobState: JobState = {
        ...jobState,
        progress,
        updatedAt: new Date(),
      };

      // Store updated state
      await this.state.storage.put(`job:${jobId}`, updatedJobState);
      this.jobsCache.set(jobId, updatedJobState);

      // Add history entry
      await this.addJobHistory(jobId, "progress", { progress, message });

      return { success: true };
    } catch (error) {
      console.error(`Failed to update job ${jobId} progress:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Mark job as completed with result
   */
  async completeJob(
    jobId: string,
    result: JobResult
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await this.initialize();

      const jobState = this.jobsCache.get(jobId);
      if (!jobState) {
        return { success: false, error: "Job not found" };
      }

      // Update job state
      const updatedJobState: JobState = {
        ...jobState,
        status: "completed",
        result,
        progress: 100,
        completedAt: new Date(),
        updatedAt: new Date(),
      };

      // Store updated state
      await this.state.storage.put(`job:${jobId}`, updatedJobState);
      this.jobsCache.set(jobId, updatedJobState);

      // Add history entry
      await this.addJobHistory(jobId, "completed", { result });

      console.log(`Job ${jobId} completed successfully`);
      return { success: true };
    } catch (error) {
      console.error(`Failed to complete job ${jobId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Mark job as failed with error
   */
  async failJob(
    jobId: string,
    error: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await this.initialize();

      const jobState = this.jobsCache.get(jobId);
      if (!jobState) {
        return { success: false, error: "Job not found" };
      }

      // Update job state
      const updatedJobState: JobState = {
        ...jobState,
        status: "failed",
        error,
        failedAt: new Date(),
        updatedAt: new Date(),
      };

      // Store updated state
      await this.state.storage.put(`job:${jobId}`, updatedJobState);
      this.jobsCache.set(jobId, updatedJobState);

      // Add history entry
      await this.addJobHistory(jobId, "failed", { error });

      console.log(`Job ${jobId} failed: ${error}`);
      return { success: true };
    } catch (err) {
      console.error(`Failed to mark job ${jobId} as failed:`, err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }

  /**
   * Retry a failed job
   */
  async retryJob(jobId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await this.initialize();

      const jobState = this.jobsCache.get(jobId);
      if (!jobState) {
        return { success: false, error: "Job not found" };
      }

      if (jobState.status !== "failed") {
        return { success: false, error: "Can only retry failed jobs" };
      }

      if (jobState.retryCount >= jobState.maxRetries) {
        return { success: false, error: "Maximum retry count exceeded" };
      }

      // Update job state for retry
      const updatedJobState: JobState = {
        ...jobState,
        status: "pending",
        progress: 0,
        retryCount: jobState.retryCount + 1,
        updatedAt: new Date(),
      };

      // Remove error and failedAt properties
      delete (updatedJobState as any).error;
      delete (updatedJobState as any).failedAt;

      // Store updated state
      await this.state.storage.put(`job:${jobId}`, updatedJobState);
      this.jobsCache.set(jobId, updatedJobState);

      // Add history entry
      await this.addJobHistory(jobId, "retried", {
        retryCount: updatedJobState.retryCount,
      });

      console.log(
        `Retrying job ${jobId} (attempt ${updatedJobState.retryCount})`
      );
      return { success: true };
    } catch (error) {
      console.error(`Failed to retry job ${jobId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Cancel a job
   */
  async cancelJob(
    jobId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await this.initialize();

      const jobState = this.jobsCache.get(jobId);
      if (!jobState) {
        return { success: false, error: "Job not found" };
      }

      if (["completed", "failed", "cancelled"].includes(jobState.status)) {
        return {
          success: false,
          error: "Cannot cancel completed, failed, or already cancelled job",
        };
      }

      // Update job state
      const updatedJobState: JobState = {
        ...jobState,
        status: "cancelled",
        updatedAt: new Date(),
      };

      // Store updated state
      await this.state.storage.put(`job:${jobId}`, updatedJobState);
      this.jobsCache.set(jobId, updatedJobState);

      // Add history entry
      await this.addJobHistory(jobId, "cancelled", {
        message: "Job cancelled by user",
      });

      console.log(`Job ${jobId} cancelled`);
      return { success: true };
    } catch (error) {
      console.error(`Failed to cancel job ${jobId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get job status
   */
  async getJobStatus(
    jobId: string
  ): Promise<{ success: boolean; jobState?: JobState; error?: string }> {
    try {
      await this.initialize();

      const jobState = this.jobsCache.get(jobId);
      if (!jobState) {
        return { success: false, error: "Job not found" };
      }

      return { success: true, jobState };
    } catch (error) {
      console.error(`Failed to get job ${jobId} status:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get job history
   */
  async getJobHistory(
    jobId: string
  ): Promise<{ success: boolean; history?: JobHistory[]; error?: string }> {
    try {
      await this.initialize();

      const historyList = await this.state.storage.list<JobHistory>({
        prefix: `history:${jobId}:`,
      });

      const history = Array.from(historyList.values()).sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      return { success: true, history };
    } catch (error) {
      console.error(`Failed to get job ${jobId} history:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Clean up old completed jobs
   */
  async cleanupOldJobs(
    olderThanDays: number = 7
  ): Promise<{ success: boolean; cleanedCount?: number; error?: string }> {
    try {
      await this.initialize();

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      let cleanedCount = 0;
      const jobsToCleanup: string[] = [];

      // Find jobs to cleanup
      for (const [jobId, jobState] of this.jobsCache.entries()) {
        if (
          ["completed", "failed", "cancelled"].includes(jobState.status) &&
          (jobState.completedAt || jobState.failedAt || jobState.updatedAt) <
            cutoffDate
        ) {
          jobsToCleanup.push(jobId);
        }
      }

      // Remove jobs from storage and cache
      for (const jobId of jobsToCleanup) {
        await this.state.storage.delete(`job:${jobId}`);
        await this.state.storage.delete(`history:${jobId}:`);
        this.jobsCache.delete(jobId);
        cleanedCount++;
      }

      console.log(`Cleaned up ${cleanedCount} old jobs`);
      return { success: true, cleanedCount };
    } catch (error) {
      console.error("Failed to cleanup old jobs:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get job statistics
   */
  async getJobStats(): Promise<{
    success: boolean;
    stats?: any;
    error?: string;
  }> {
    try {
      await this.initialize();

      const stats = {
        total: this.jobsCache.size,
        pending: 0,
        active: 0,
        completed: 0,
        failed: 0,
        cancelled: 0,
        retrying: 0,
      };

      for (const jobState of this.jobsCache.values()) {
        stats[jobState.status as keyof typeof stats]++;
      }

      return { success: true, stats };
    } catch (error) {
      console.error("Failed to get job stats:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Add entry to job history
   */
  private async addJobHistory(
    jobId: string,
    action: JobHistory["action"],
    data?: any,
    message?: string
  ): Promise<void> {
    const historyEntry: JobHistory = {
      id: `${jobId}-${Date.now()}`,
      jobId,
      action,
      timestamp: new Date(),
      data,
      ...(message && { message }),
    };

    const historyKey = `history:${jobId}:${historyEntry.id}`;
    await this.state.storage.put(historyKey, historyEntry);
  }

  /**
   * Validate status transition
   */
  private isValidStatusTransition(
    currentStatus: JobStatus,
    newStatus: JobStatus
  ): boolean {
    const validTransitions: Record<JobStatus, JobStatus[]> = {
      pending: ["queued", "active", "cancelled"],
      queued: ["active", "cancelled"],
      active: ["completed", "failed", "cancelled"],
      completed: [], // Terminal state
      failed: ["retrying", "cancelled"],
      cancelled: [], // Terminal state
      retrying: ["pending", "cancelled"],
    };

    return validTransitions[currentStatus]?.includes(newStatus) ?? false;
  }

  /**
   * Get history action from status
   */
  private getHistoryActionFromStatus(status: JobStatus): JobHistory["action"] {
    const statusToAction: Record<JobStatus, JobHistory["action"]> = {
      pending: "created",
      queued: "created",
      active: "started",
      completed: "completed",
      failed: "failed",
      cancelled: "cancelled",
      retrying: "retried",
    };

    return statusToAction[status] || "created";
  }

  /**
   * HTTP request handler for the Durable Object
   */
  async fetch(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      const method = request.method;
      const path = url.pathname;

      // Route requests based on method and path
      if (method === "GET" && path === "/stats") {
        const result = await this.getJobStats();
        return new Response(JSON.stringify(result), {
          headers: { "Content-Type": "application/json" },
        });
      }

      if (method === "POST" && path === "/cleanup") {
        const body = (await request.json()) as { olderThanDays?: number };
        const olderThanDays = body.olderThanDays || 7;
        const result = await this.cleanupOldJobs(olderThanDays);
        return new Response(JSON.stringify(result), {
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response("Not Found", { status: 404 });
    } catch (error) {
      console.error("JobManager fetch error:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }
}

// Export the Durable Object class for use in wrangler.toml
export { JobManager as JobManagerDO };
