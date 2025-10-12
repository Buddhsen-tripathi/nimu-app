/**
 * R2 Storage Index
 *
 * This file exports all R2-related services and utilities for video storage.
 */

export { VideoStorageService } from "./VideoStorage";

// Re-export types for convenience
export type {
  VideoMetadata,
  UploadProgress,
  SignedUrlOptions,
  VideoStorageEnv,
} from "./VideoStorage";
