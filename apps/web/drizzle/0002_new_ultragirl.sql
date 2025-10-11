CREATE TYPE "public"."billing_period" AS ENUM('daily', 'weekly', 'monthly', 'yearly');--> statement-breakpoint
CREATE TYPE "public"."conversation_status" AS ENUM('active', 'archived', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."conversation_type" AS ENUM('video_generation', 'audio_generation', 'general_chat');--> statement-breakpoint
CREATE TYPE "public"."generation_status" AS ENUM('pending', 'processing', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."generation_type" AS ENUM('video', 'audio');--> statement-breakpoint
CREATE TYPE "public"."message_role" AS ENUM('user', 'assistant', 'system');--> statement-breakpoint
CREATE TYPE "public"."message_type" AS ENUM('text', 'prompt', 'response', 'error', 'generation_request', 'generation_result');--> statement-breakpoint
CREATE TYPE "public"."provider" AS ENUM('veo3', 'runway', 'pika', 'stable_video', 'elevenlabs', 'murf', 'synthesia');--> statement-breakpoint
CREATE TYPE "public"."usage_type" AS ENUM('video_generation', 'audio_generation', 'api_call', 'storage');--> statement-breakpoint
ALTER TABLE "verification" ALTER COLUMN "updated_at" DROP DEFAULT;