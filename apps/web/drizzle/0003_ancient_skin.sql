ALTER TYPE "public"."provider" ADD VALUE 'google' BEFORE 'veo3';--> statement-breakpoint
ALTER TABLE "generation" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "generation" ALTER COLUMN "status" SET DEFAULT 'pending'::text;--> statement-breakpoint
ALTER TABLE "generation_job" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "generation_job" ALTER COLUMN "status" SET DEFAULT 'pending'::text;--> statement-breakpoint
DROP TYPE "public"."generation_status";--> statement-breakpoint
CREATE TYPE "public"."generation_status" AS ENUM('pending_clarification', 'pending_confirmation', 'confirmed', 'queued', 'processing', 'completed', 'failed', 'cancelled');--> statement-breakpoint
ALTER TABLE "generation" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."generation_status";--> statement-breakpoint
ALTER TABLE "generation" ALTER COLUMN "status" SET DATA TYPE "public"."generation_status" USING "status"::"public"."generation_status";--> statement-breakpoint
ALTER TABLE "generation_job" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."generation_status";--> statement-breakpoint
ALTER TABLE "generation_job" ALTER COLUMN "status" SET DATA TYPE "public"."generation_status" USING "status"::"public"."generation_status";--> statement-breakpoint
ALTER TABLE "generation" ADD COLUMN "clarification_questions" jsonb;--> statement-breakpoint
ALTER TABLE "generation" ADD COLUMN "clarification_responses" jsonb;--> statement-breakpoint
ALTER TABLE "generation" ADD COLUMN "worker_job_id" text;