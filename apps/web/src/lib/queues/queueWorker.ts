import { Worker } from "bullmq";
import type { Job } from "bullmq";
import { redis } from "../redis";
import {
  generationQueue,
  QUEUE_NAME,
  MAX_CONCURRENT_JOBS,
  type GenerationJobData,
  type GenerationJobResult,
} from "./generationQueue";
import {
  updateGenerationJob,
  updateGenerationStatus,
  getGenerationById,
} from "../queries/generations";
import type { Generation } from "../../db/schema";

// Import Veo3 service (to be implemented)
// import { Veo3Service } from "../services/veo3Service";

// Worker configuration
const workerConfig = {
  connection: redis,
  concurrency: MAX_CONCURRENT_JOBS,
  removeOnComplete: { age: 24 * 3600, count: 10 },
  removeOnFail: { age: 24 * 3600, count: 50 },
};

// Create the worker
export const generationWorker = new Worker<GenerationJobData>(
  QUEUE_NAME,
  async (job: Job<GenerationJobData>): Promise<GenerationJobResult> => {
    const { generationId, userId, prompt, parameters, provider, model } =
      job.data;

    console.log(
      `Processing generation job ${job.id} for generation ${generationId}`
    );

    try {
      // Update job status to processing
      await updateGenerationJob(job.id!, "processing", {
        progress: 0,
      });

      // Update generation status
      await updateGenerationStatus(generationId, "processing", userId);

      // Update job progress
      await job.updateProgress(10);

      // Simulate Veo3 generation process
      // TODO: Replace with actual Veo3 API integration
      const result = await processVideoGeneration(job, {
        generationId,
        userId,
        prompt,
        parameters,
        provider,
        model,
      });

      // Update final progress
      await job.updateProgress(100);

      // Update job status to completed
      await updateGenerationJob(job.id!, "completed", {
        progress: 100,
      });

      // Update generation status and result
      await updateGenerationStatus(generationId, "completed", userId, {
        resultUrl: result.resultUrl,
        thumbnailUrl: result.thumbnailUrl,
        duration: result.duration,
        fileSize: result.fileSize,
        resolution: result.resolution,
        format: result.format,
        completedAt: new Date(),
      });

      console.log(`Generation job ${job.id} completed successfully`);
      return result;
    } catch (error) {
      console.error(`Generation job ${job.id} failed:`, error);

      // Update job status to failed
      await updateGenerationJob(job.id!, "failed", {
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });

      // Update generation status
      await updateGenerationStatus(generationId, "failed", userId, {
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        failedAt: new Date(),
      });

      throw error;
    }
  },
  workerConfig
);

// Worker event handlers
generationWorker.on("ready", () => {
  console.log("Generation worker is ready");
});

generationWorker.on("active", (job: Job) => {
  console.log(`Worker processing job ${job.id}`);
});

generationWorker.on("completed", (job: Job, result: any) => {
  console.log(`Worker completed job ${job.id} with result:`, result);
});

generationWorker.on("failed", (job: Job | undefined, err: Error) => {
  console.error(`Worker failed job ${job?.id}:`, err);
});

generationWorker.on("stalled", (jobId: string) => {
  console.warn(`Worker stalled job ${jobId}`);
});

generationWorker.on("error", (err: Error) => {
  console.error("Generation worker error:", err);
});

// Video generation processing function
async function processVideoGeneration(
  job: Job<GenerationJobData>,
  data: GenerationJobData
): Promise<GenerationJobResult> {
  const { generationId, prompt, parameters } = data;

  try {
    // Update progress: Starting generation
    await job.updateProgress(20);

    // TODO: Implement actual Veo3 API integration
    // const veo3Service = new Veo3Service();
    // const result = await veo3Service.generateVideo(prompt, parameters);

    // Simulate generation process with progress updates
    await simulateGenerationProgress(job);

    // Mock result for now
    const mockResult: GenerationJobResult = {
      success: true,
      resultUrl: `https://storage.example.com/videos/${generationId}.mp4`,
      thumbnailUrl: `https://storage.example.com/thumbnails/${generationId}.jpg`,
      duration: 30,
      fileSize: 15728640, // 15MB
      resolution: "1920x1080",
      format: "mp4",
    };

    return mockResult;
  } catch (error) {
    console.error("Video generation failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Simulate generation progress updates
async function simulateGenerationProgress(
  job: Job<GenerationJobData>
): Promise<void> {
  const progressSteps = [30, 50, 70, 90];

  for (const progress of progressSteps) {
    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Update job progress
    await job.updateProgress(progress);

    console.log(
      `Generation progress updated to ${progress}% for job ${job.id}`
    );
  }
}

// Worker utility functions
export class WorkerUtils {
  /**
   * Start the worker
   */
  static async startWorker(): Promise<void> {
    try {
      await generationWorker.waitUntilReady();
      console.log("Generation worker started successfully");
    } catch (error) {
      console.error("Failed to start generation worker:", error);
      throw error;
    }
  }

  /**
   * Stop the worker
   */
  static async stopWorker(): Promise<void> {
    try {
      await generationWorker.close();
      console.log("Generation worker stopped successfully");
    } catch (error) {
      console.error("Failed to stop generation worker:", error);
      throw error;
    }
  }

  /**
   * Check worker health
   */
  static async checkWorkerHealth(): Promise<boolean> {
    try {
      // Check if worker is running
      const isRunning = generationWorker.isRunning();
      return isRunning;
    } catch (error) {
      console.error("Worker health check failed:", error);
      return false;
    }
  }

  /**
   * Get worker statistics
   */
  static async getWorkerStats(): Promise<{
    isRunning: boolean;
    concurrency: number;
    name: string;
  }> {
    return {
      isRunning: generationWorker.isRunning(),
      concurrency: MAX_CONCURRENT_JOBS,
      name: generationWorker.name,
    };
  }
}

// Graceful shutdown
export async function closeWorker(): Promise<void> {
  try {
    await generationWorker.close();
    console.log("Generation worker closed gracefully");
  } catch (error) {
    console.error("Error closing generation worker:", error);
  }
}

// Auto-start worker if this file is run directly
if (require.main === module) {
  WorkerUtils.startWorker().catch(console.error);
}

export default generationWorker;
