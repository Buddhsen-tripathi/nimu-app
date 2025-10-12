/**
 * R2 Storage Usage Examples
 *
 * This file demonstrates how to use the R2 video storage system
 * in your Cloudflare Workers application.
 */

import {
  VideoStorageHelper,
  FileValidator,
  ProgressTracker,
} from "../utils/r2";
import type { VideoStorageEnv } from "../r2";

/**
 * Example: Upload a video file
 */
export async function uploadVideoExample(
  env: VideoStorageEnv,
  file: File,
  userId: string,
  generationId: string
) {
  // Create video storage helper
  const videoStorage = new VideoStorageHelper(env);

  // Validate file before upload
  const validation = FileValidator.validateVideoFile(file, file.name);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Upload video
  const result = await videoStorage.uploadVideo(file, {
    id: `${generationId}_video`,
    generationId,
    userId,
    filename: file.name,
    contentType: file.type,
    size: file.size,
    duration: 0, // Would be extracted from video metadata
    resolution: "1920x1080", // Would be extracted from video metadata
  });

  if (!result.success) {
    throw new Error(result.error);
  }

  return {
    videoId: result.videoId,
    url: result.url,
  };
}

/**
 * Example: Generate signed URL for secure access
 */
export async function generateSecureUrlExample(
  env: VideoStorageEnv,
  videoId: string
) {
  const videoStorage = new VideoStorageHelper(env);

  // Generate signed URL valid for 1 hour
  const result = await videoStorage.generateSignedUrl(videoId, {
    expiresIn: 3600, // 1 hour
    allowDownload: true,
  });

  if (!result.success) {
    throw new Error(result.error);
  }

  return result.url;
}

/**
 * Example: List user's videos
 */
export async function listUserVideosExample(
  env: VideoStorageEnv,
  userId: string
) {
  const videoStorage = new VideoStorageHelper(env);

  const result = await videoStorage.listVideos(userId);

  if (!result.success) {
    throw new Error(result.error);
  }

  return result.videos || [];
}

/**
 * Example: Generate thumbnail for video
 */
export async function generateThumbnailExample(
  env: VideoStorageEnv,
  videoId: string
) {
  const videoStorage = new VideoStorageHelper(env);

  // Generate thumbnail at 5 seconds into the video
  const result = await videoStorage.generateThumbnail(videoId, 5000);

  if (!result.success) {
    throw new Error(result.error);
  }

  return result.thumbnailUrl;
}

/**
 * Example: Clean up old videos
 */
export async function cleanupOldVideosExample(env: VideoStorageEnv) {
  const videoStorage = new VideoStorageHelper(env);

  // Delete videos older than 30 days
  const result = await videoStorage.cleanupOldVideos(30);

  if (!result.success) {
    throw new Error(result.error);
  }

  return result.cleanedCount;
}

/**
 * Example: Complete video processing workflow
 */
export async function completeVideoWorkflowExample(
  env: VideoStorageEnv,
  videoFile: File,
  userId: string,
  generationId: string
) {
  try {
    // 1. Upload video
    console.log("Uploading video...");
    const uploadResult = await uploadVideoExample(
      env,
      videoFile,
      userId,
      generationId
    );

    // 2. Generate thumbnail
    console.log("Generating thumbnail...");
    const thumbnailResult = await generateThumbnailExample(
      env,
      uploadResult.videoId!
    );

    // 3. Get video metadata
    console.log("Getting video metadata...");
    const videoStorage = new VideoStorageHelper(env);
    const metadataResult = await videoStorage.getVideoMetadata(
      uploadResult.videoId!
    );

    if (!metadataResult.success || !metadataResult.metadata) {
      throw new Error("Failed to get video metadata");
    }

    // 4. Generate signed URLs for different purposes
    const publicUrl = await generateSecureUrlExample(
      env,
      uploadResult.videoId!
    );

    return {
      success: true,
      videoId: uploadResult.videoId,
      publicUrl,
      thumbnailUrl: thumbnailResult,
      metadata: metadataResult.metadata,
    };
  } catch (error) {
    console.error("Video workflow failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Example: Progress tracking for large uploads
 */
export async function uploadWithProgressExample(
  env: VideoStorageEnv,
  file: File,
  userId: string,
  generationId: string
) {
  const progressTracker = new ProgressTracker();
  const uploadId = `upload_${Date.now()}`;

  try {
    // Start tracking
    progressTracker.startTracking(uploadId, file.size);

    // Simulate chunked upload (in real implementation, you'd split the file)
    const chunkSize = 1024 * 1024; // 1MB chunks
    let uploadedBytes = 0;

    while (uploadedBytes < file.size) {
      // Simulate chunk upload
      const chunk = file.slice(uploadedBytes, uploadedBytes + chunkSize);
      uploadedBytes += chunk.size;

      // Update progress
      const progress = progressTracker.updateProgress(uploadId, uploadedBytes);
      console.log(`Upload progress: ${progress}%`);

      // In real implementation, you'd upload the chunk here
      await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate network delay
    }

    // Complete upload
    const videoStorage = new VideoStorageHelper(env);
    const result = await videoStorage.uploadVideo(file, {
      id: `${generationId}_video`,
      generationId,
      userId,
      filename: file.name,
      contentType: file.type,
      size: file.size,
    });

    // Complete tracking
    progressTracker.completeTracking(uploadId);

    return result;
  } catch (error) {
    progressTracker.completeTracking(uploadId);
    throw error;
  }
}

/**
 * Example: Batch operations
 */
export async function batchVideoOperationsExample(
  env: VideoStorageEnv,
  userId: string
) {
  const videoStorage = new VideoStorageHelper(env);

  try {
    // 1. List all user videos
    const listResult = await videoStorage.listVideos(userId);
    if (!listResult.success || !listResult.videos) {
      throw new Error("Failed to list videos");
    }

    // 2. Generate signed URLs for all videos
    const signedUrls = await Promise.all(
      listResult.videos.map(async (video) => {
        const urlResult = await videoStorage.generateSignedUrl(video.id);
        return {
          videoId: video.id,
          url: urlResult.success ? urlResult.url : null,
          metadata: video,
        };
      })
    );

    // 3. Clean up old videos
    const cleanupResult = await videoStorage.cleanupOldVideos(30);

    return {
      success: true,
      videos: signedUrls,
      cleanedCount: cleanupResult.success ? cleanupResult.cleanedCount : 0,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Example: Error handling and retry logic
 */
export async function uploadWithRetryExample(
  env: VideoStorageEnv,
  file: File,
  userId: string,
  generationId: string,
  maxRetries: number = 3
) {
  const videoStorage = new VideoStorageHelper(env);
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Upload attempt ${attempt}/${maxRetries}`);

      const result = await videoStorage.uploadVideo(file, {
        id: `${generationId}_video`,
        generationId,
        userId,
        filename: file.name,
        contentType: file.type,
        size: file.size,
      });

      if (result.success) {
        return result;
      }

      throw new Error(result.error || "Upload failed");
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`Upload attempt ${attempt} failed:`, lastError.message);

      if (attempt < maxRetries) {
        // Wait before retry (exponential backoff)
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s...
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error("All upload attempts failed");
}
