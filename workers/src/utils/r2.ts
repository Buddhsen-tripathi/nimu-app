/**
 * R2 Storage Utilities
 *
 * Helper functions and classes for working with R2 storage in Cloudflare Workers.
 * These utilities provide convenient methods for video storage operations.
 */

import {
  VideoStorageService,
  type VideoStorageEnv,
  type VideoMetadata,
  type SignedUrlOptions,
} from "../r2";

/**
 * Get R2 bucket instance from environment
 */
export function getVideoStorageBucket(env: VideoStorageEnv): R2Bucket {
  return env.VIDEO_STORAGE;
}

/**
 * Create VideoStorageService instance
 */
export function createVideoStorageService(
  env: VideoStorageEnv
): VideoStorageService {
  const bucket = getVideoStorageBucket(env);
  return new VideoStorageService(bucket);
}

/**
 * Video Storage Helper Class
 */
export class VideoStorageHelper {
  private service: VideoStorageService;

  constructor(env: VideoStorageEnv) {
    this.service = createVideoStorageService(env);
  }

  /**
   * Upload video with automatic validation
   */
  async uploadVideo(
    file: File | ArrayBuffer,
    metadata: Omit<
      VideoMetadata,
      "uploadedAt" | "accessCount" | "lastAccessedAt"
    >
  ) {
    return await this.service.uploadVideo(file, metadata);
  }

  /**
   * Download video by ID
   */
  async downloadVideo(videoId: string) {
    return await this.service.downloadVideo(videoId);
  }

  /**
   * Delete video by ID
   */
  async deleteVideo(videoId: string) {
    return await this.service.deleteVideo(videoId);
  }

  /**
   * Generate signed URL for secure access
   */
  async generateSignedUrl(videoId: string, options?: SignedUrlOptions) {
    return await this.service.generateSignedUrl(videoId, options);
  }

  /**
   * Get video metadata
   */
  async getVideoMetadata(videoId: string) {
    return await this.service.getVideoMetadata(videoId);
  }

  /**
   * List videos with optional filtering
   */
  async listVideos(userId?: string, generationId?: string, limit?: number) {
    return await this.service.listVideos(userId, generationId, limit);
  }

  /**
   * Generate thumbnail for video
   */
  async generateThumbnail(videoId: string, timestamp?: number) {
    return await this.service.generateThumbnail(videoId, timestamp);
  }

  /**
   * Clean up old videos
   */
  async cleanupOldVideos(olderThanDays?: number) {
    return await this.service.cleanupOldVideos(olderThanDays);
  }
}

/**
 * File validation utilities
 */
export class FileValidator {
  static readonly SUPPORTED_VIDEO_FORMATS = [
    "video/mp4",
    "video/webm",
    "video/avi",
    "video/mov",
    "video/quicktime",
    "video/x-msvideo",
    "video/3gpp",
    "video/mpeg",
  ];

  static readonly MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

  /**
   * Validate video file
   */
  static validateVideoFile(
    file: File | ArrayBuffer,
    filename: string
  ): { valid: boolean; error?: string } {
    const size = file instanceof File ? file.size : file.byteLength;
    const contentType = this.getContentType(filename);

    // Check file size
    if (size > this.MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File size exceeds maximum limit of ${this.MAX_FILE_SIZE / (1024 * 1024)}MB`,
      };
    }

    // Check file format
    if (!this.SUPPORTED_VIDEO_FORMATS.includes(contentType)) {
      return {
        valid: false,
        error: `Unsupported file format: ${contentType}`,
      };
    }

    return { valid: true };
  }

  /**
   * Get content type from filename
   */
  static getContentType(filename: string): string {
    const extension = filename.toLowerCase().split(".").pop();
    const contentTypes: Record<string, string> = {
      mp4: "video/mp4",
      webm: "video/webm",
      avi: "video/avi",
      mov: "video/quicktime",
      qt: "video/quicktime",
      "3gp": "video/3gpp",
      mpeg: "video/mpeg",
      mpg: "video/mpeg",
    };

    return contentTypes[extension || ""] || "application/octet-stream";
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes: number): string {
    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  /**
   * Generate unique filename
   */
  static generateUniqueFilename(
    originalFilename: string,
    prefix?: string
  ): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const extension = originalFilename.split(".").pop();
    const baseName = prefix || "video";

    return `${baseName}_${timestamp}_${random}.${extension}`;
  }
}

/**
 * URL generation utilities
 */
export class URLGenerator {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Generate public video URL
   */
  generateVideoUrl(videoId: string, filename: string): string {
    return `${this.baseUrl}/videos/${videoId}/${filename}`;
  }

  /**
   * Generate thumbnail URL
   */
  generateThumbnailUrl(videoId: string): string {
    return `${this.baseUrl}/thumbnails/${videoId}/thumbnail.jpg`;
  }

  /**
   * Generate download URL
   */
  generateDownloadUrl(videoId: string, filename: string): string {
    return `${this.baseUrl}/download/${videoId}/${filename}`;
  }
}

/**
 * Progress tracking utilities
 */
export class ProgressTracker {
  private progressMap: Map<
    string,
    { bytesUploaded: number; totalBytes: number }
  > = new Map();

  /**
   * Start tracking upload progress
   */
  startTracking(uploadId: string, totalBytes: number): void {
    this.progressMap.set(uploadId, {
      bytesUploaded: 0,
      totalBytes,
    });
  }

  /**
   * Update upload progress
   */
  updateProgress(uploadId: string, bytesUploaded: number): number {
    const progress = this.progressMap.get(uploadId);
    if (!progress) return 0;

    progress.bytesUploaded = bytesUploaded;
    return Math.round((bytesUploaded / progress.totalBytes) * 100);
  }

  /**
   * Get upload progress
   */
  getProgress(
    uploadId: string
  ): { percentage: number; bytesUploaded: number; totalBytes: number } | null {
    const progress = this.progressMap.get(uploadId);
    if (!progress) return null;

    return {
      percentage: Math.round(
        (progress.bytesUploaded / progress.totalBytes) * 100
      ),
      bytesUploaded: progress.bytesUploaded,
      totalBytes: progress.totalBytes,
    };
  }

  /**
   * Complete tracking
   */
  completeTracking(uploadId: string): void {
    this.progressMap.delete(uploadId);
  }

  /**
   * Clear all tracking data
   */
  clearAll(): void {
    this.progressMap.clear();
  }
}

/**
 * Error types for R2 operations
 */
export class R2Error extends Error {
  constructor(
    message: string,
    public operation: string,
    public videoId?: string,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = "R2Error";
  }
}

/**
 * Configuration for R2 operations
 */
export interface R2Config {
  maxFileSize: number;
  supportedFormats: string[];
  defaultExpiration: number; // seconds
  cleanupRetentionDays: number;
  thumbnailGenerationEnabled: boolean;
}

export const DEFAULT_R2_CONFIG: R2Config = {
  maxFileSize: 500 * 1024 * 1024, // 500MB
  supportedFormats: [
    "video/mp4",
    "video/webm",
    "video/avi",
    "video/mov",
    "video/quicktime",
    "video/x-msvideo",
    "video/3gpp",
    "video/mpeg",
  ],
  defaultExpiration: 3600, // 1 hour
  cleanupRetentionDays: 30,
  thumbnailGenerationEnabled: true,
};
