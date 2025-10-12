/**
 * Worker Service
 *
 * This service handles the actual video generation worker logic,
 * processing jobs from the queue and coordinating with Veo3.
 *
 * Key Features:
 * - Job processing from queue
 * - Veo3 API integration
 * - Progress tracking
 * - Error handling and retry logic
 * - Video storage management
 */

import { DurableObjectManager } from "../utils/durable-objects";
import { VideoStorageHelper } from "../utils/r2";
import {
  GenerationWorkflow,
  createGenerationWorkflow,
} from "./GenerationWorkflow";

export interface WorkerServiceConfig {
  veo3ApiKey: string;
  veo3BaseUrl?: string;
  maxConcurrentJobs: number;
  pollingInterval: number;
  timeoutMs: number;
  enableClarifications: boolean;
  enableProgressTracking: boolean;
  retryAttempts: number;
}

export interface WorkerInfo {
  id: string;
  name: string;
  version: string;
  capabilities: string[];
  status: "idle" | "busy" | "error";
  currentJobs: string[];
  processedJobs: number;
  lastHeartbeat: Date;
}

export class WorkerService {
  private config: WorkerServiceConfig;
  private durableObjectManager: DurableObjectManager;
  // private _videoStorage: VideoStorageHelper; // TODO: Use for video operations
  private generationWorkflow: GenerationWorkflow;
  private workerInfo: WorkerInfo;
  private isRunning: boolean = false;
  private processingJobs: Set<string> = new Set();

  constructor(
    config: WorkerServiceConfig,
    durableObjectManager: DurableObjectManager,
    videoStorage: VideoStorageHelper
  ) {
    this.config = config;
    this.durableObjectManager = durableObjectManager;
    // this._videoStorage = videoStorage; // TODO: Use for video operations

    this.generationWorkflow = createGenerationWorkflow(
      {
        veo3ApiKey: config.veo3ApiKey,
        veo3BaseUrl: config.veo3BaseUrl || "https://api.veo3.com",
        maxRetries: config.retryAttempts,
        pollingInterval: config.pollingInterval,
        timeoutMs: config.timeoutMs,
        enableClarifications: config.enableClarifications,
        enableProgressTracking: config.enableProgressTracking,
      },
      durableObjectManager,
      videoStorage
    );

    this.workerInfo = {
      id: this.generateWorkerId(),
      name: "Nimu Generation Worker",
      version: "1.0.0",
      capabilities: ["video_generation", "veo3_integration", "r2_storage"],
      status: "idle",
      currentJobs: [],
      processedJobs: 0,
      lastHeartbeat: new Date(),
    };
  }

  /**
   * Start the worker service
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn("Worker service is already running");
      return;
    }

    console.log(`Starting worker service: ${this.workerInfo.id}`);
    this.isRunning = true;

    try {
      // Register worker with queue manager
      await this.registerWorker();

      // Start processing loop
      this.startProcessingLoop();

      // Start heartbeat
      this.startHeartbeat();

      console.log("Worker service started successfully");
    } catch (error) {
      console.error("Failed to start worker service:", error);
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * Stop the worker service
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.warn("Worker service is not running");
      return;
    }

    console.log("Stopping worker service...");
    this.isRunning = false;

    try {
      // Complete current jobs
      for (const jobId of this.processingJobs) {
        await this.handleJobError(jobId, "Worker stopping");
      }

      // Unregister worker
      await this.unregisterWorker();

      console.log("Worker service stopped");
    } catch (error) {
      console.error("Error stopping worker service:", error);
    }
  }

  /**
   * Register worker with queue manager
   */
  async registerWorker(): Promise<void> {
    try {
      const result =
        await this.durableObjectManager.queueManager.registerWorker(
          this.workerInfo.id,
          {
            name: this.workerInfo.name,
            version: this.workerInfo.version,
            capabilities: this.workerInfo.capabilities,
            status: this.workerInfo.status,
            maxConcurrentJobs: this.config.maxConcurrentJobs,
            registeredAt: new Date(),
          }
        );

      if (!result.success) {
        throw new Error(result.error || "Failed to register worker");
      }

      console.log("Worker registered successfully");
    } catch (error) {
      console.error("Worker registration error:", error);
      throw error;
    }
  }

  /**
   * Unregister worker from queue manager
   */
  async unregisterWorker(): Promise<void> {
    try {
      // Note: QueueManager doesn't have unregister method yet
      // This would be implemented to clean up worker registration
      console.log("Worker unregistered");
    } catch (error) {
      console.error("Worker unregistration error:", error);
    }
  }

  /**
   * Start the main processing loop
   */
  private startProcessingLoop(): void {
    const processLoop = async () => {
      while (this.isRunning) {
        try {
          // Check if we can process more jobs
          if (this.processingJobs.size >= this.config.maxConcurrentJobs) {
            await this.sleep(this.config.pollingInterval);
            continue;
          }

          // Get next job from queue
          const jobResult =
            await this.durableObjectManager.queueManager.getNextJob();

          if (jobResult.success && jobResult.result) {
            const job = jobResult.result as any;
            await this.processJob(job);
          } else {
            // No jobs available, wait before checking again
            await this.sleep(this.config.pollingInterval);
          }
        } catch (error) {
          console.error("Processing loop error:", error);
          await this.sleep(this.config.pollingInterval);
        }
      }
    };

    // Start processing loop (non-blocking)
    processLoop().catch((error) => {
      console.error("Processing loop fatal error:", error);
      this.isRunning = false;
    });
  }

  /**
   * Process a single job
   */
  private async processJob(job: any): Promise<void> {
    const jobId = job.id;

    try {
      console.log(`Processing job: ${jobId}`);

      this.processingJobs.add(jobId);
      this.workerInfo.currentJobs.push(jobId);
      this.workerInfo.status = "busy";

      // Update job status to processing
      await this.durableObjectManager.jobManager.updateJobStatus(
        jobId,
        "processing",
        { workerId: this.workerInfo.id, startedAt: new Date() }
      );

      // Process the generation
      const result = await this.generationWorkflow.processGeneration(jobId);

      if (result.success) {
        console.log(`Job completed successfully: ${jobId}`);
        this.workerInfo.processedJobs++;
      } else {
        console.error(`Job failed: ${jobId} - ${result.error}`);
        await this.handleJobError(jobId, result.error || "Unknown error");
      }
    } catch (error) {
      console.error(`Job processing error for ${jobId}:`, error);
      await this.handleJobError(
        jobId,
        error instanceof Error ? error.message : "Unknown error"
      );
    } finally {
      // Clean up
      this.processingJobs.delete(jobId);
      this.workerInfo.currentJobs = this.workerInfo.currentJobs.filter(
        (id) => id !== jobId
      );

      if (this.processingJobs.size === 0) {
        this.workerInfo.status = "idle";
      }
    }
  }

  /**
   * Handle job error
   */
  private async handleJobError(jobId: string, error: string): Promise<void> {
    try {
      await this.durableObjectManager.jobManager.failJob(jobId, error);
      await this.durableObjectManager.queueManager.failJob(jobId);
    } catch (err) {
      console.error(`Error handling job failure for ${jobId}:`, err);
    }
  }

  /**
   * Start heartbeat to queue manager
   */
  private startHeartbeat(): void {
    const heartbeat = async () => {
      while (this.isRunning) {
        try {
          await this.durableObjectManager.queueManager.updateWorkerHeartbeat(
            this.workerInfo.id
          );
          this.workerInfo.lastHeartbeat = new Date();

          await this.sleep(30000); // 30 seconds
        } catch (error) {
          console.error("Heartbeat error:", error);
          await this.sleep(5000); // 5 seconds on error
        }
      }
    };

    // Start heartbeat (non-blocking)
    heartbeat().catch((error) => {
      console.error("Heartbeat fatal error:", error);
    });
  }

  /**
   * Get worker status
   */
  getWorkerStatus(): WorkerInfo {
    return {
      ...this.workerInfo,
      currentJobs: [...this.workerInfo.currentJobs],
    };
  }

  /**
   * Get worker statistics
   */
  getWorkerStats(): Record<string, any> {
    return {
      workerId: this.workerInfo.id,
      status: this.workerInfo.status,
      isRunning: this.isRunning,
      currentJobs: this.processingJobs.size,
      maxConcurrentJobs: this.config.maxConcurrentJobs,
      processedJobs: this.workerInfo.processedJobs,
      lastHeartbeat: this.workerInfo.lastHeartbeat,
      capabilities: this.workerInfo.capabilities,
    };
  }

  /**
   * Generate unique worker ID
   */
  private generateWorkerId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `worker_${timestamp}_${random}`;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Create worker service instance
 */
export function createWorkerService(
  config: WorkerServiceConfig,
  durableObjectManager: DurableObjectManager,
  videoStorage: VideoStorageHelper
): WorkerService {
  return new WorkerService(config, durableObjectManager, videoStorage);
}
