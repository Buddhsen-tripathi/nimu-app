/**
 * QueueManager Durable Object
 *
 * This Durable Object manages the job queue and worker coordination.
 * It replaces BullMQ queue management in the Cloudflare Workers environment.
 *
 * Key Features:
 * - Priority-based job queuing
 * - Worker coordination and load balancing
 * - Queue statistics and monitoring
 * - Queue pause/resume functionality
 * - Automatic job scheduling
 * - Worker health monitoring
 */

import type { QueueJob, QueueStats, JobData } from "../types/job";

export interface QueueManagerEnv {
  // Environment bindings will be added here as needed
}

export interface WorkerInfo {
  id: string;
  name: string;
  isActive: boolean;
  lastHeartbeat: Date;
  concurrency: number;
  processedJobs: number;
  failedJobs: number;
  currentJobs: Set<string>;
}

export class QueueManager {
  private state: DurableObjectState;
  // private _env: QueueManagerEnv; // TODO: Use for environment variables, bindings, etc.

  // In-memory cache for frequently accessed data
  private queue: QueueJob[] = [];
  private activeJobs: Map<string, QueueJob> = new Map();
  private workers: Map<string, WorkerInfo> = new Map();
  private isInitialized = false;
  private isPaused = false;

  constructor(state: DurableObjectState, _env: QueueManagerEnv) {
    this.state = state;
    // this._env = env; // TODO: Use for environment variables, bindings, etc.
    // Note: env is available for future use (environment variables, bindings, etc.)
  }

  /**
   * Initialize the QueueManager by loading existing queue state from storage
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load queue state from storage
      const queueData = await this.state.storage.get<any>("queue:state");
      if (queueData) {
        this.queue = queueData.queue || [];
        this.isPaused = queueData.isPaused || false;
      }

      // Load worker information
      const workersList = await this.state.storage.list({ prefix: "worker:" });
      for (const [key, workerInfo] of workersList.entries()) {
        const workerId = key.replace("worker:", "");
        this.workers.set(workerId, workerInfo as WorkerInfo);
      }

      this.isInitialized = true;
      console.log(
        `QueueManager initialized with ${this.queue.length} queued jobs and ${this.workers.size} workers`
      );
    } catch (error) {
      console.error("Failed to initialize QueueManager:", error);
      throw new Error("QueueManager initialization failed");
    }
  }

  /**
   * Add job to queue
   */
  async addToQueue(
    jobData: JobData
  ): Promise<{ success: boolean; queuePosition?: number; error?: string }> {
    try {
      await this.initialize();

      if (this.isPaused) {
        return { success: false, error: "Queue is currently paused" };
      }

      // Check if job is already in queue
      const existingJob = this.queue.find((job) => job.id === jobData.id);
      if (existingJob) {
        return { success: false, error: "Job already exists in queue" };
      }

      // Create queue job
      const queueJob: QueueJob = {
        id: jobData.id,
        priority: jobData.priority || 0,
        createdAt: new Date(),
        data: jobData,
        status: "pending",
        progress: 0,
      };

      // Insert job in priority order (higher priority first)
      this.insertJobByPriority(queueJob);

      // Persist queue state
      await this.persistQueueState();

      const queuePosition =
        this.queue.findIndex((job) => job.id === jobData.id) + 1;

      console.log(
        `Added job ${jobData.id} to queue at position ${queuePosition}`
      );
      return { success: true, queuePosition };
    } catch (error) {
      console.error("Failed to add job to queue:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get next job to process
   */
  async getNextJob(
    workerId?: string
  ): Promise<{ success: boolean; job?: QueueJob; error?: string }> {
    try {
      await this.initialize();

      if (this.isPaused) {
        return { success: false, error: "Queue is paused" };
      }

      if (this.queue.length === 0) {
        return { success: true };
      }

      // Get the highest priority job that's not already active
      const nextJob = this.queue.find((job) => !this.activeJobs.has(job.id));
      if (!nextJob) {
        return { success: true };
      }

      // Move job to active state
      this.activeJobs.set(nextJob.id, nextJob);
      nextJob.status = "active";

      // Remove from queue
      this.queue = this.queue.filter((job) => job.id !== nextJob.id);

      // Update worker info if provided
      if (workerId) {
        const worker = this.workers.get(workerId);
        if (worker) {
          worker.currentJobs.add(nextJob.id);
          worker.lastHeartbeat = new Date();
          await this.state.storage.put(`worker:${workerId}`, worker);
        }
      }

      // Persist queue state
      await this.persistQueueState();

      console.log(
        `Assigned job ${nextJob.id} to worker ${workerId || "unknown"}`
      );
      return { success: true, job: nextJob };
    } catch (error) {
      console.error("Failed to get next job:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Update queue position for a job
   */
  async updateQueuePosition(
    jobId: string,
    newPriority?: number
  ): Promise<{ success: boolean; newPosition?: number; error?: string }> {
    try {
      await this.initialize();

      const jobIndex = this.queue.findIndex((job) => job.id === jobId);
      if (jobIndex === -1) {
        return { success: false, error: "Job not found in queue" };
      }

      const job = this.queue[jobIndex];

      // Update priority if provided
      if (newPriority !== undefined && job) {
        job.priority = newPriority;
      }

      // Re-sort queue by priority
      this.queue = this.queue.filter((j) => j.id !== jobId);
      if (job) {
        this.insertJobByPriority(job);
      }

      // Persist queue state
      await this.persistQueueState();

      const newPosition = this.queue.findIndex((j) => j.id === jobId) + 1;

      console.log(`Updated job ${jobId} position to ${newPosition}`);
      return { success: true, newPosition };
    } catch (error) {
      console.error(`Failed to update queue position for job ${jobId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Complete a job and remove it from active jobs
   */
  async completeJob(
    jobId: string,
    workerId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await this.initialize();

      const activeJob = this.activeJobs.get(jobId);
      if (!activeJob) {
        return { success: false, error: "Job not found in active jobs" };
      }

      // Remove from active jobs
      this.activeJobs.delete(jobId);

      // Update worker info if provided
      if (workerId) {
        const worker = this.workers.get(workerId);
        if (worker) {
          worker.currentJobs.delete(jobId);
          worker.processedJobs++;
          worker.lastHeartbeat = new Date();
          await this.state.storage.put(`worker:${workerId}`, worker);
        }
      }

      console.log(`Completed job ${jobId}`);
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
   * Fail a job and optionally retry it
   */
  async failJob(
    jobId: string,
    workerId?: string,
    shouldRetry: boolean = true
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await this.initialize();

      const activeJob = this.activeJobs.get(jobId);
      if (!activeJob) {
        return { success: false, error: "Job not found in active jobs" };
      }

      // Remove from active jobs
      this.activeJobs.delete(jobId);

      // Update worker info if provided
      if (workerId) {
        const worker = this.workers.get(workerId);
        if (worker) {
          worker.currentJobs.delete(jobId);
          worker.failedJobs++;
          worker.lastHeartbeat = new Date();
          await this.state.storage.put(`worker:${workerId}`, worker);
        }
      }

      // Re-queue job if should retry
      if (shouldRetry) {
        activeJob.status = "pending";
        this.insertJobByPriority(activeJob);
        await this.persistQueueState();
        console.log(`Re-queued failed job ${jobId} for retry`);
      }

      console.log(`Failed job ${jobId}`);
      return { success: true };
    } catch (error) {
      console.error(`Failed to handle job failure ${jobId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    success: boolean;
    stats?: QueueStats;
    error?: string;
  }> {
    try {
      await this.initialize();

      const stats: QueueStats = {
        waiting: this.queue.length,
        active: this.activeJobs.size,
        completed: 0, // This would need to be tracked separately or calculated
        failed: 0, // This would need to be tracked separately or calculated
        delayed: 0, // Not implemented in this version
        totalProcessed: 0,
        averageProcessingTime: 0,
      };

      // Calculate totals from worker stats
      for (const worker of this.workers.values()) {
        stats.totalProcessed += worker.processedJobs;
        stats.failed += worker.failedJobs;
      }

      return { success: true, stats };
    } catch (error) {
      console.error("Failed to get queue stats:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Pause queue processing
   */
  async pauseQueue(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.initialize();

      this.isPaused = true;
      await this.persistQueueState();

      console.log("Queue paused");
      return { success: true };
    } catch (error) {
      console.error("Failed to pause queue:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Resume queue processing
   */
  async resumeQueue(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.initialize();

      this.isPaused = false;
      await this.persistQueueState();

      console.log("Queue resumed");
      return { success: true };
    } catch (error) {
      console.error("Failed to resume queue:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Clear all jobs from queue
   */
  async clearQueue(): Promise<{
    success: boolean;
    clearedCount?: number;
    error?: string;
  }> {
    try {
      await this.initialize();

      const clearedCount = this.queue.length;
      this.queue = [];
      this.activeJobs.clear();

      await this.persistQueueState();

      console.log(`Cleared ${clearedCount} jobs from queue`);
      return { success: true, clearedCount };
    } catch (error) {
      console.error("Failed to clear queue:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get queue status
   */
  async getQueueStatus(): Promise<{
    success: boolean;
    status?: any;
    error?: string;
  }> {
    try {
      await this.initialize();

      const status = {
        isPaused: this.isPaused,
        queueLength: this.queue.length,
        activeJobs: this.activeJobs.size,
        workerCount: this.workers.size,
        activeWorkers: Array.from(this.workers.values()).filter(
          (w) => w.isActive
        ).length,
        lastUpdated: new Date(),
      };

      return { success: true, status };
    } catch (error) {
      console.error("Failed to get queue status:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Register a worker
   */
  async registerWorker(
    workerId: string,
    workerInfo: Partial<WorkerInfo>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await this.initialize();

      const worker: WorkerInfo = {
        id: workerId,
        name: workerInfo.name || `Worker-${workerId}`,
        isActive: true,
        lastHeartbeat: new Date(),
        concurrency: workerInfo.concurrency || 1,
        processedJobs: 0,
        failedJobs: 0,
        currentJobs: new Set(),
        ...workerInfo,
      };

      this.workers.set(workerId, worker);
      await this.state.storage.put(`worker:${workerId}`, worker);

      console.log(`Registered worker ${workerId}`);
      return { success: true };
    } catch (error) {
      console.error(`Failed to register worker ${workerId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Update worker heartbeat
   */
  async updateWorkerHeartbeat(
    workerId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await this.initialize();

      const worker = this.workers.get(workerId);
      if (!worker) {
        return { success: false, error: "Worker not found" };
      }

      worker.lastHeartbeat = new Date();
      worker.isActive = true;
      await this.state.storage.put(`worker:${workerId}`, worker);

      return { success: true };
    } catch (error) {
      console.error(`Failed to update worker ${workerId} heartbeat:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Clean up inactive workers
   */
  async cleanupInactiveWorkers(
    inactiveThresholdMinutes: number = 5
  ): Promise<{ success: boolean; cleanedCount?: number; error?: string }> {
    try {
      await this.initialize();

      const threshold = new Date();
      threshold.setMinutes(threshold.getMinutes() - inactiveThresholdMinutes);

      let cleanedCount = 0;
      const inactiveWorkers: string[] = [];

      for (const [workerId, worker] of this.workers.entries()) {
        if (worker.lastHeartbeat < threshold) {
          inactiveWorkers.push(workerId);
        }
      }

      for (const workerId of inactiveWorkers) {
        const worker = this.workers.get(workerId);
        if (worker) {
          // Move current jobs back to queue
          for (const jobId of worker.currentJobs) {
            const activeJob = this.activeJobs.get(jobId);
            if (activeJob) {
              activeJob.status = "pending";
              this.insertJobByPriority(activeJob);
              this.activeJobs.delete(jobId);
            }
          }

          // Remove worker
          this.workers.delete(workerId);
          await this.state.storage.delete(`worker:${workerId}`);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        await this.persistQueueState();
        console.log(`Cleaned up ${cleanedCount} inactive workers`);
      }

      return { success: true, cleanedCount };
    } catch (error) {
      console.error("Failed to cleanup inactive workers:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Insert job in priority order
   */
  private insertJobByPriority(job: QueueJob): void {
    let insertIndex = this.queue.length;

    for (let i = 0; i < this.queue.length; i++) {
      if (job.priority > (this.queue[i]?.priority || 0)) {
        insertIndex = i;
        break;
      }
    }

    this.queue.splice(insertIndex, 0, job);
  }

  /**
   * Persist queue state to storage
   */
  private async persistQueueState(): Promise<void> {
    await this.state.storage.put("queue:state", {
      queue: this.queue,
      isPaused: this.isPaused,
      lastUpdated: new Date(),
    });
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
        const result = await this.getQueueStats();
        return new Response(JSON.stringify(result), {
          headers: { "Content-Type": "application/json" },
        });
      }

      if (method === "GET" && path === "/status") {
        const result = await this.getQueueStatus();
        return new Response(JSON.stringify(result), {
          headers: { "Content-Type": "application/json" },
        });
      }

      if (method === "POST" && path === "/pause") {
        const result = await this.pauseQueue();
        return new Response(JSON.stringify(result), {
          headers: { "Content-Type": "application/json" },
        });
      }

      if (method === "POST" && path === "/resume") {
        const result = await this.resumeQueue();
        return new Response(JSON.stringify(result), {
          headers: { "Content-Type": "application/json" },
        });
      }

      if (method === "POST" && path === "/clear") {
        const result = await this.clearQueue();
        return new Response(JSON.stringify(result), {
          headers: { "Content-Type": "application/json" },
        });
      }

      if (method === "POST" && path === "/cleanup-workers") {
        const body = (await request.json()) as {
          inactiveThresholdMinutes?: number;
        };
        const threshold = body.inactiveThresholdMinutes || 5;
        const result = await this.cleanupInactiveWorkers(threshold);
        return new Response(JSON.stringify(result), {
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response("Not Found", { status: 404 });
    } catch (error) {
      console.error("QueueManager fetch error:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }
}

// Export the Durable Object class for use in wrangler.toml
export { QueueManager as QueueManagerDO };
